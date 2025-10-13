/**
 * Represents a Discord user
 */
class User {
  /**
   * Create a new User instance
   * @param {Client} client - The Discord client
   * @param {object} data - Raw user data from Discord API
   */
  constructor(client, data) {
    this.client = client;
    this.data = data;

    // Copy all user properties
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      this[camelKey] = value;
    }
  }

  /**
   * Set the user's presence/status
   * @param {object} presence - Presence data
   * @param {string} [presence.status] - Status: 'online', 'idle', 'dnd', 'invisible'
   * @param {Array} [presence.activities] - Array of activity objects
   * @param {boolean} [presence.afk] - Whether the user is AFK
   * @param {number} [presence.since] - Unix timestamp of when the status was set
   * @returns {void}
   */
  setPresence(presence) {
    if (!this.client.ws || !this.client.ws.ready) {
      throw new Error("Client is not connected");
    }

    const presenceData = {
      status: presence.status || "online",
      since: presence.since || 0,
      activities: presence.activities || [],
      afk: presence.afk || false,
    };

    // Send presence update via WebSocket
    this.client.ws.send({
      op: 3,
      d: presenceData,
    });

    // Update client's stored presence
    this.client.options.presence = presenceData;
  }

  /**
   * Set the user's status (convenience method)
   * @param {string} status - Status: 'online', 'idle', 'dnd', 'invisible'
   * @returns {void}
   */
  setStatus(status) {
    this.setPresence({
      status: status,
      since: this.client.options.presence.since,
      activities: this.client.options.presence.activities,
      afk: this.client.options.presence.afk,
    });
  }

  /**
   * Set the user's activity
   * @param {object} activity - Activity data
   * @param {string} activity.name - Activity name
   * @param {string} [activity.type=0] - Activity type (0=Playing, 1=Streaming, 2=Listening, 3=Watching, 5=Competing)
   * @param {string} [activity.url] - Stream URL (for type 1)
   * @returns {void}
   */
  setActivity(activity) {
    const activities = activity ? [activity] : [];
    this.setPresence({
      status: this.client.options.presence.status,
      since: this.client.options.presence.since,
      activities: activities,
      afk: this.client.options.presence.afk,
    });
  }
}

module.exports = User;
