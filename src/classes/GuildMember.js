/**
 * Represents a Discord guild member
 */
const Permissions = require("./Permissions");

/**
 * Safe BigInt conversion
 * @param {*} value - Value to convert to BigInt
 * @returns {bigint} BigInt representation
 */
function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") return BigInt(value);
  if (typeof value === "number") return BigInt(value);
  return 0n;
}

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
   * @returns {Permissions} Permissions bitfield
   */
  get permissions() {
    if (this._permissions) return this._permissions;

    // Calculate permissions based on roles
    let permissions = 0n;

    // If member is the guild owner, they have all permissions
    if (this.id === this.guild.ownerId) {
      permissions = Permissions.ALL;
    } else {
      // Start with @everyone role permissions
      const everyoneRole = this.guild.roles?.find(
        (role) => role.id === this.guild.id,
      );
      if (everyoneRole && everyoneRole.permissions != null) {
        permissions |= toBigInt(everyoneRole.permissions);
      }

      // Add permissions from member's roles
      for (const roleId of this.roles || []) {
        const role = this.guild.roles?.find((r) => r.id === roleId);
        if (role && role.permissions != null) {
          permissions |= toBigInt(role.permissions);
        }
      }
    }

    this._permissions = new Permissions(permissions);
    return this._permissions;
  }

  set permissions(value) {
    if (value instanceof Permissions) {
      this._permissions = value;
    } else {
      this._permissions = new Permissions(value);
    }
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
