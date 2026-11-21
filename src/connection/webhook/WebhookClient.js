const DiscordAPIError = require("../../classes/DiscordAPIError");

/**
 * Convert a color value to Discord's expected integer format
 * @param {*} color - Color value (hex string, number, etc.)
 * @returns {number|null} Integer color value or null
 */
function resolveColor(color) {
  if (color === null || color === undefined) return null;
  if (typeof color === "number") return color;
  if (typeof color === "string") {
    // Handle hex colors
    if (color.startsWith("#")) {
      return parseInt(color.slice(1), 16);
    }
    // Handle other string formats if needed
    return parseInt(color, 16);
  }
  return null;
}

class WebhookClient {
  /**
   * Create a new WebhookClient
   * @param {string|object} urlOrId - The webhook URL, an object containing `id` and `token` (or `url`), or just the webhook ID
   * @param {string|object} [tokenOrOptions={}] - The webhook token (if first arg is ID) or default options
   * @param {object} [options={}] - Default options for the webhook (if first two args are ID and token)
   */
  constructor(urlOrId, tokenOrOptions = {}, options = {}) {
    const secondArg = tokenOrOptions || {};
    const thirdArg = options || {};

    if (typeof urlOrId === "object" && urlOrId !== null) {
      // constructor({ id, token, url, ...options }, options)
      const data = urlOrId;

      if (data.url) {
        this.url = data.url.split(/[?#]/, 1)[0].replace(/\/+$/, "");
        try {
          const parsed = WebhookClient.parseURL(data.url);
          this.id = parsed.id;
          this.token = parsed.token;
        } catch {
          // Ignore parse errors for custom/mock URLs
        }
      } else if (data.id && data.token) {
        this.id = data.id.toString();
        this.token = data.token;
        this.url = `https://discord.com/api/webhooks/${this.id}/${this.token}`;
      } else {
        throw new Error(
          "WebhookClient requires either a URL or an ID and Token",
        );
      }

      this.options = {
        username: data.username || secondArg.username || null,
        avatarURL: data.avatarURL || secondArg.avatarURL || null,
        ...data,
        ...secondArg,
      };

      // Clean up internal keys from options
      delete this.options.id;
      delete this.options.token;
      delete this.options.url;
    } else if (
      typeof urlOrId === "string" &&
      typeof tokenOrOptions === "string"
    ) {
      // constructor(id, token, options)
      this.id = urlOrId;
      this.token = tokenOrOptions;
      this.url = `https://discord.com/api/webhooks/${this.id}/${this.token}`;
      this.options = {
        username: thirdArg.username || null,
        avatarURL: thirdArg.avatarURL || null,
        ...thirdArg,
      };
    } else if (typeof urlOrId === "string") {
      // constructor(url, options)
      this.url = urlOrId.split(/[?#]/, 1)[0].replace(/\/+$/, "");
      try {
        const parsed = WebhookClient.parseURL(urlOrId);
        this.id = parsed.id;
        this.token = parsed.token;
      } catch {
        // Ignore parse errors for custom/mock URLs
      }
      this.options = {
        username: secondArg.username || null,
        avatarURL: secondArg.avatarURL || null,
        ...secondArg,
      };
    } else {
      throw new Error(
        "Invalid parameters provided to WebhookClient constructor",
      );
    }
  }

  /**
   * Build a webhook endpoint URL with query parameters.
   * @private
   * @param {string} [pathname=""] - Path suffix (e.g. `/messages/123`)
   * @param {object} [query={}] - Query parameters
   * @returns {string} Full request URL
   */
  _buildURL(pathname = "", query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return `${this.url}${pathname}${qs ? `?${qs}` : ""}`;
  }

  /**
   * Return a token-redacted path for error reporting.
   * @private
   * @param {string} [pathname=""] - Path suffix
   * @returns {string} Redacted webhook path
   */
  _getErrorPath(pathname = "") {
    return `/webhooks/${this.id || "unknown"}${pathname}`;
  }

  /**
   * Prepare JSON or multipart FormData body and headers for a webhook request.
   * @private
   * @param {object} payload - Built webhook payload
   * @returns {{body: string|FormData, headers: object}}
   */
  _prepareRequestBody(payload) {
    const filesToUpload = [];
    const keepAttachments = [];

    const rawAttachments = payload.attachments || [];
    if (Array.isArray(rawAttachments)) {
      for (const att of rawAttachments) {
        if (
          att &&
          typeof att === "object" &&
          (att.data !== undefined || att.attachment !== undefined)
        ) {
          filesToUpload.push(att);
        } else {
          keepAttachments.push(att);
        }
      }
    }

    const rawFiles = payload.files || [];
    if (Array.isArray(rawFiles)) {
      for (const file of rawFiles) {
        if (
          file &&
          typeof file === "object" &&
          (file.data !== undefined || file.attachment !== undefined)
        ) {
          filesToUpload.push(file);
        } else if (file !== undefined && file !== null) {
          filesToUpload.push({ data: file });
        }
      }
    }

    const headers = {};
    if (filesToUpload.length > 0) {
      const formData = new FormData();

      const uploadedAttachmentsMetadata = filesToUpload.map((file, index) => {
        const filename = file.name || `file_${index}`;
        const description = file.description || null;
        return {
          id: index,
          filename,
          description,
        };
      });

      payload.attachments = [
        ...keepAttachments,
        ...uploadedAttachmentsMetadata,
      ];

      delete payload.files;

      formData.append("payload_json", JSON.stringify(payload));

      filesToUpload.forEach((file, index) => {
        const fileData = file.data ?? file.attachment;
        const filename = file.name || `file_${index}`;
        const blob = new Blob([fileData]);
        formData.append(`files[${index}]`, blob, filename);
      });

      return { body: formData, headers };
    }

    headers["Content-Type"] = "application/json";
    return { body: JSON.stringify(payload), headers };
  }

  /**
   * Send a message to the webhook
   * @param {string|object|Array} content - Message content, a payload object, or an array of embeds
   * @param {object} [options={}] - Additional options for this specific message
   * @returns {Promise<object|null>} The sent message data, or null if no content is returned
   * @throws {DiscordAPIError} If the request fails
   */
  async send(content, options = {}) {
    const opts = options || {};
    let payload;

    // Handle different input types
    if (typeof content === "string") {
      // send('content', { embeds: [...] })
      payload = this._buildPayload(content, opts);
    } else if (Array.isArray(content)) {
      // send([embed1, embed2])
      payload = this._buildPayload(undefined, { ...opts, embeds: content });
    } else if (content && typeof content === "object") {
      if (content.title || content.description || content.fields) {
        // send(embed)
        payload = this._buildPayload(undefined, { ...opts, embeds: [content] });
      } else {
        // send({ content: 'text', embeds: [...] })
        payload = this._buildPayload(content, opts);
      }
    } else {
      // Fallback
      payload = this._buildPayload(undefined, opts);
    }

    const threadId =
      opts.threadId ??
      opts.thread_id ??
      (content && typeof content === "object" && !Array.isArray(content)
        ? (content.threadId ?? content.thread_id)
        : undefined);

    const { body: requestBody, headers } = this._prepareRequestBody(payload);
    const url = this._buildURL("", { wait: "true", thread_id: threadId });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook send failed: ${error.message}`,
        response.status,
        this._getErrorPath(),
        error,
      );
    }

    return await response.json().catch(() => null);
  }

  /**
   * Edit a previously sent message
   * @param {string} messageId - ID of the message to edit
   * @param {string|object} content - New content or payload object
   * @param {object} [options={}] - Additional options
   * @returns {Promise<object|null>} The edited message data
   * @throws {DiscordAPIError} If the request fails
   */
  async edit(messageId, content, options = {}) {
    const opts = options || {};
    const payload = this._buildPayload(content, opts, {
      includeProfile: false,
    });
    const threadId =
      opts.threadId ??
      opts.thread_id ??
      (content && typeof content === "object"
        ? (content.threadId ?? content.thread_id)
        : undefined);

    const { body: requestBody, headers } = this._prepareRequestBody(payload);
    const url = this._buildURL(`/messages/${messageId}`, {
      thread_id: threadId,
    });

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook edit failed: ${error.message}`,
        response.status,
        this._getErrorPath(`/messages/${messageId}`),
        error,
      );
    }

    return await response.json().catch(() => null);
  }

  /**
   * Delete a message sent by this webhook
   * @param {string} messageId - ID of the message to delete
   * @param {object} [options={}] - Additional options
   * @returns {Promise<true>}
   * @throws {DiscordAPIError} If the request fails
   */
  async delete(messageId, options = {}) {
    const opts = options || {};
    const url = this._buildURL(`/messages/${messageId}`, {
      thread_id: opts.threadId ?? opts.thread_id,
    });

    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook delete failed: ${error.message}`,
        response.status,
        this._getErrorPath(`/messages/${messageId}`),
        error,
      );
    }

    return true;
  }

  /**
   * Fetch a message sent by this webhook
   * @param {string} messageId - ID of the message to fetch
   * @param {object} [options={}] - Additional options
   * @returns {Promise<object>} The message data
   * @throws {DiscordAPIError} If the request fails
   */
  async fetchMessage(messageId, options = {}) {
    const opts = options || {};
    const url = this._buildURL(`/messages/${messageId}`, {
      thread_id: opts.threadId ?? opts.thread_id,
    });

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook fetch failed: ${error.message}`,
        response.status,
        this._getErrorPath(`/messages/${messageId}`),
        error,
      );
    }

    return await response.json();
  }

  /**
   * Build the payload for webhook requests.
   * @param {string|object|undefined} content - The main content for the payload.
   * @param {object} [options={}] - Additional options to include.
   * @param {object} [config={}] - Payload builder options.
   * @param {boolean} [config.includeProfile=true] - Whether to include username and avatar_url.
   * @returns {object} The constructed payload.
   * @private
   */
  _buildPayload(content, options = {}, { includeProfile = true } = {}) {
    const opts = options || {};
    const payload = {};

    // Handle content (string or object)
    if (typeof content === "string") {
      payload.content = content;
    } else if (content && typeof content === "object") {
      Object.assign(payload, content);
    }

    if (includeProfile) {
      // Apply webhook-specific options
      if (this.options.username) {
        payload.username = this.options.username;
      }
      if (this.options.avatarURL) {
        payload.avatar_url = this.options.avatarURL;
      }
      if (payload.avatarURL && !payload.avatar_url) {
        payload.avatar_url = payload.avatarURL;
      }

      // Apply message-specific options
      if (opts.username) {
        payload.username = opts.username;
      }
      if (opts.avatarURL) {
        payload.avatar_url = opts.avatarURL;
      }
    } else {
      delete payload.username;
      delete payload.avatar_url;
    }
    delete payload.avatarURL;

    if (opts.embeds !== undefined) {
      payload.embeds = opts.embeds;
    }
    if (Array.isArray(payload.embeds)) {
      payload.embeds = payload.embeds.map((embed) => ({
        ...embed,
        color: resolveColor(embed.color),
      }));
    }

    if (opts.tts !== undefined) {
      payload.tts = opts.tts;
    }
    if (opts.allowedMentions !== undefined) {
      payload.allowed_mentions = opts.allowedMentions;
    } else if (payload.allowedMentions !== undefined) {
      if (payload.allowed_mentions === undefined) {
        payload.allowed_mentions = payload.allowedMentions;
      }
    }
    delete payload.allowedMentions;

    if (opts.attachments !== undefined) {
      payload.attachments = opts.attachments;
    }
    if (opts.files !== undefined) {
      payload.files = opts.files;
    }
    if (opts.components !== undefined) {
      payload.components = opts.components;
    }
    if (opts.flags !== undefined) {
      payload.flags = opts.flags;
    }

    delete payload.threadId;
    delete payload.thread_id;

    return payload;
  }

  /**
   * Create a simple embed object.
   * @param {object} [data={}] - Embed data.
   * @returns {object} The embed object.
   */
  static createEmbed(data = {}) {
    return {
      title: data.title || null,
      description: data.description || null,
      url: data.url || null,
      timestamp: data.timestamp || null,
      color: resolveColor(data.color),
      footer: data.footer
        ? {
            text: data.footer.text,
            icon_url: data.footer.iconURL || data.footer.icon_url,
          }
        : null,
      image: data.image ? { url: data.image } : null,
      thumbnail: data.thumbnail ? { url: data.thumbnail } : null,
      author: data.author
        ? {
            name: data.author.name,
            url: data.author.url,
            icon_url: data.author.iconURL || data.author.icon_url,
          }
        : null,
      fields: data.fields || [],
    };
  }

  /**
   * Parse a webhook URL to get its ID and token.
   * @param {string} url - The webhook URL.
   * @returns {{id: string, token: string}} The webhook ID and token.
   * @throws {Error} If the URL is invalid.
   */
  static parseURL(url) {
    if (typeof url !== "string") {
      throw new Error("Invalid webhook URL");
    }
    const match = url.match(
      /(?:ptb\.|canary\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d+)\/([^/?#]+)/,
    );
    if (!match) {
      throw new Error("Invalid webhook URL");
    }
    return {
      id: match[1],
      token: match[2],
    };
  }
}

module.exports = WebhookClient;
