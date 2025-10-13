/**
 * A BitField is a data structure that makes it easy to interact with a bitfield.
 */
class BitField {
  /**
   * @param {BitFieldResolvable} [bits=BitField.defaultBit] Bit(s) to read from
   */
  constructor(bits = BitField.defaultBit) {
    /**
     * Bitfield of the packed bits
     * @type {bigint}
     */
    this.bitfield = BitField.resolve(bits);
  }

  /**
   * Checks whether the bitfield has a bit, or any of multiple bits.
   * @param {BitFieldResolvable} bit Bit(s) to check for
   * @returns {boolean}
   */
  any(bit) {
    return (this.bitfield & BitField.resolve(bit)) !== BitField.defaultBit;
  }

  /**
   * Checks whether the bitfield has a bit, or multiple bits.
   * @param {BitFieldResolvable} bit Bit(s) to check for
   * @returns {boolean}
   */
  has(bit) {
    bit = BitField.resolve(bit);
    return (this.bitfield & bit) === bit;
  }

  /**
   * Gets all given bits that are missing from the bitfield.
   * @param {BitFieldResolvable} bits Bit(s) to check for
   * @returns {string[]}
   */
  missing(bits) {
    const res = [];
    const bit = BitField.resolve(bits);

    for (const [flag, value] of Object.entries(this.constructor.FLAGS)) {
      if ((bit & value) !== value) continue;
      if ((this.bitfield & value) === value) continue;
      res.push(flag);
    }

    return res;
  }

  /**
   * Gets an {@link Array} of bitfield names based on the bits available.
   * @param {boolean} [has=true] Whether to show bits that are set
   * @returns {string[]}
   */
  toArray(has = true) {
    const arr = [];

    for (const [flag, value] of Object.entries(this.constructor.FLAGS)) {
      if (has) {
        if ((this.bitfield & value) === value) arr.push(flag);
      } else {
        if ((this.bitfield & value) !== value) arr.push(flag);
      }
    }

    return arr;
  }

  /**
   * Data that can be resolved to give a bitfield. This can be:
   * * A string (see {@link BitField.FLAGS})
   * * A bit number
   * * An instance of BitField
   * * An Array of BitFieldResolvable
   * @typedef {string|bigint|BitField|BitFieldResolvable[]} BitFieldResolvable
   */

  /**
   * Resolves bitfields to their numeric form.
   * @param {BitFieldResolvable} [bit=BitField.defaultBit] bit(s) to resolve
   * @returns {bigint}
   */
  static resolve(bit = BitField.defaultBit) {
    if (typeof bit === "bigint" && bit >= BitField.defaultBit) return bit;
    if (bit instanceof BitField) return bit.bitfield;
    if (Array.isArray(bit))
      return bit
        .map((p) => this.resolve(p))
        .reduce((prev, p) => prev | p, BitField.defaultBit);
    if (typeof bit === "string") return this.FLAGS[bit];
    throw new TypeError("BitField.resolve: Invalid bitfield");
  }
}

/**
 * Numeric bitfield flags.
 * @type {Object<string, bigint>}
 */
BitField.FLAGS = {};

/**
 * The default bit to use if none are provided.
 * @type {bigint}
 */
BitField.defaultBit = 0n;

module.exports = BitField;
