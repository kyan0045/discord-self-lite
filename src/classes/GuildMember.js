/**
 * Represents a Discord guild member
 */
class GuildMember {
  /**
   * Create a new GuildMember instance
   * @param {Client} client - The Discord client
   * @param {object} data - Raw member data from Discord API
   * @param {Guild} guild - The guild this member belongs to
   */
  constructor(client, data, guild) {
    this.client = client;
    this.guild = guild;
    this.data = data;
    this._permissions = null;

    // Copy all member properties
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      this[camelKey] = value;
    }

    // Handle user data separately
    if (data.user) {
      this.user = data.user;
      this.id = data.user.id;
    }

    this.roles = this.roles || [];
    this.joinedAt = this.joinedAt || data.joined_at;
  }

  /**
   * Check if this member is the client user
   * @returns {boolean} True if this member represents the client
   */
  get isClient() {
    return this.id === this.client.user?.id;
  }

  /**
   * Get the member's display name (nickname or username)
   * @returns {string} The display name
   */
  get displayName() {
    return this.nick || this.user?.username || "Unknown";
  }

  /**
   * Get the member's permissions in this guild
   * @returns {Array<string>} Array of permission strings
   */
  get permissions() {
    // This is a simplified implementation
    // In a full implementation, you'd calculate permissions based on roles
    return this._permissions;
  }

  set permissions(value) {
    this._permissions = value ?? null;
  }

  /**
   * Check if the member has specific permissions
   * @param {Array<string>} permissions - Permission flags to check
   * @returns {boolean} True if member has all permissions
   */
  hasPermission() {
    // TODO: Implement proper permission checking
    // Simplified implementation - always return true for now
    return true;
  }
}

module.exports = GuildMember;
