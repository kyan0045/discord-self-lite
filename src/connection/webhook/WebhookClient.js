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
    if (typeof urlOrId === "object" && urlOrId !== null) {
      // constructor({ id, token, url, ...options }, options)
      const data = urlOrId;
      const opts = tokenOrOptions || {};

      if (data.url) {
        this.url = data.url;
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
        username: data.username || opts.username || null,
        avatarURL: data.avatarURL || opts.avatarURL || null,
        ...data,
        ...opts,
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
        username: options.username || null,
        avatarURL: options.avatarURL || null,
        ...options,
      };
    } else if (typeof urlOrId === "string") {
      // constructor(url, options)
      this.url = urlOrId;
      try {
        const parsed = WebhookClient.parseURL(urlOrId);
        this.id = parsed.id;
        this.token = parsed.token;
      } catch {
        // Ignore parse errors for custom/mock URLs
      }
      this.options = {
        username: tokenOrOptions.username || null,
        avatarURL: tokenOrOptions.avatarURL || null,
        ...tokenOrOptions,
      };
    } else {
      throw new Error(
        "Invalid parameters provided to WebhookClient constructor",
      );
    }
  }

  /**
   * Send a message to the webhook
   * @param {string|object|Array} content - Message content, a payload object, or an array of embeds
   * @param {object} [options={}] - Additional options for this specific message
   * @returns {Promise<object|null>} The sent message data, or null if no content is returned
   * @throws {DiscordAPIError} If the request fails
   */
  async send(content, options = {}) {
    let payload = {};

    // Handle different input types
    if (typeof content === "string") {
      // send('content', { embeds: [...] })
      payload = this._buildPayload(content, options);
    } else if (Array.isArray(content)) {
      // send([embed1, embed2])
      payload = this._buildPayload("", { embeds: content, ...options });
    } else if (content && typeof content === "object") {
      if (content.title || content.description || content.fields) {
        // send(embed)
        payload = this._buildPayload("", { embeds: [content], ...options });
      } else {
        // send({ content: 'text', embeds: [...] })
        payload = this._buildPayload(content.content || "", {
          ...content,
          ...options,
        });
      }
    } else {
      // Fallback
      payload = this._buildPayload("", options);
    }

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
        } else if (file) {
          filesToUpload.push({ data: file });
        }
      }
    }

    let requestBody;
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
        const fileData = file.data || file.attachment;
        const filename = file.name || `file_${index}`;
        const blob = new Blob([fileData]);
        formData.append(`files[${index}]`, blob, filename);
      });

      requestBody = formData;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(payload);
    }

    const response = await fetch(this.url, {
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
        this.url,
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
    const payload = this._buildPayload(content, options);

    const response = await fetch(`${this.url}/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook edit failed: ${error.message}`,
        response.status,
        `${this.url}/messages/${messageId}`,
      );
    }

    return await response.json().catch(() => null);
  }

  /**
   * Delete a message sent by this webhook
   * @param {string} messageId - ID of the message to delete
   * @returns {Promise<true>}
   * @throws {DiscordAPIError} If the request fails
   */
  async delete(messageId) {
    const response = await fetch(`${this.url}/messages/${messageId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook delete failed: ${error.message}`,
        response.status,
        `${this.url}/messages/${messageId}`,
      );
    }

    return true;
  }

  /**
   * Fetch a message sent by this webhook
   * @param {string} messageId - ID of the message to fetch
   * @returns {Promise<object>} The message data
   * @throws {DiscordAPIError} If the request fails
   */
  async fetchMessage(messageId) {
    const response = await fetch(`${this.url}/messages/${messageId}`);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new DiscordAPIError(
        `Webhook fetch failed: ${error.message}`,
        response.status,
        `${this.url}/messages/${messageId}`,
      );
    }

    return await response.json();
  }

  /**
   * Build the payload for webhook requests.
   * @param {string|object} content - The main content for the payload.
   * @param {object} [options={}] - Additional options to include.
   * @returns {object} The constructed payload.
   * @private
   */
  _buildPayload(content, options = {}) {
    const payload = {};

    // Handle content (string or object)
    if (typeof content === "string") {
      payload.content = content;
    } else if (typeof content === "object") {
      Object.assign(payload, content);
    }

    // Apply webhook-specific options
    if (this.options.username) {
      payload.username = this.options.username;
    }
    if (this.options.avatarURL) {
      payload.avatar_url = this.options.avatarURL;
    }

    // Apply message-specific options
    if (options.username) {
      payload.username = options.username;
    }
    if (options.avatarURL) {
      payload.avatar_url = options.avatarURL;
    }
    if (options.embeds) {
      payload.embeds = options.embeds.map((embed) => ({
        ...embed,
        color: resolveColor(embed.color),
      }));
    }
    if (options.tts !== undefined) {
      payload.tts = options.tts;
    }
    if (options.allowedMentions) {
      payload.allowed_mentions = options.allowedMentions;
    }
    if (options.threadId) {
      payload.thread_id = options.threadId;
    }

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
    const match = url.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/(.+)/);
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
