const DiscordAPIError = require("../../classes/DiscordAPIError");

class WebhookClient {
  /**
   * Create a new WebhookClient
   * @param {string} url - The webhook URL
   * @param {object} [options={}] - Default options for the webhook
   * @param {string} [options.username] - Default username for the webhook
   * @param {string} [options.avatarURL] - Default avatar URL for the webhook
   */
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      username: options.username || null,
      avatarURL: options.avatarURL || null,
      ...options,
    };
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

    const response = await fetch(this.url, {
      method: "POST",
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
      payload.embeds = options.embeds;
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
      color: data.color || null,
      footer: data.footer
        ? {
            text: data.footer.text,
            icon_url: data.footer.iconURL,
          }
        : null,
      image: data.image ? { url: data.image } : null,
      thumbnail: data.thumbnail ? { url: data.thumbnail } : null,
      author: data.author
        ? {
            name: data.author.name,
            url: data.author.url,
            icon_url: data.author.iconURL,
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
