# BitField

A BitField is a data structure that makes it easy to interact with a bitfield.

## Constructor

```javascript
const bitfield = new BitField(bits);
```

**Parameters:**

- `bits` (BitFieldResolvable) - Bit(s) to read from

**BitFieldResolvable types:**

- `string` - Flag name or numeric string
- `bigint` - Raw bitfield value
- `BitField` - Another BitField instance
- `Array` - Array of BitFieldResolvable

## Properties

| Property   | Type   | Description            |
| ---------- | ------ | ---------------------- |
| `bitfield` | bigint | The raw bitfield value |

## Static Properties

### FLAGS

Object containing flag names mapped to their bitfield values. This should be overridden in subclasses.

```javascript
class MyBitField extends BitField {}
MyBitField.FLAGS = {
  FLAG_ONE: 1n << 0n,
  FLAG_TWO: 1n << 1n,
  FLAG_THREE: 1n << 2n,
};
```

### defaultBit

The default bit value to use if none are provided (default: `0n`).

## Methods

### any(bit)

Checks whether the bitfield has a bit, or any of multiple bits.

```javascript
const bf = new BitField(["FLAG_ONE", "FLAG_TWO"]);

if (bf.any("FLAG_ONE")) {
  console.log("Has FLAG_ONE");
}

if (bf.any(["FLAG_ONE", "FLAG_THREE"])) {
  console.log("Has either FLAG_ONE or FLAG_THREE");
}
```

**Parameters:**

- `bit` (BitFieldResolvable) - Bit(s) to check for

**Returns:** boolean

### has(bit)

Checks whether the bitfield has a bit, or multiple bits.

```javascript
if (bf.has("FLAG_ONE")) {
  console.log("Has FLAG_ONE");
}

if (bf.has(["FLAG_ONE", "FLAG_TWO"])) {
  console.log("Has both FLAG_ONE and FLAG_TWO");
}
```

**Parameters:**

- `bit` (BitFieldResolvable) - Bit(s) to check for

**Returns:** boolean

### missing(bits)

Gets all given bits that are missing from the bitfield.

```javascript
const missing = bf.missing(["FLAG_ONE", "FLAG_TWO", "FLAG_THREE"]);
console.log(missing); // ['FLAG_THREE'] if FLAG_ONE and FLAG_TWO are set
```

**Parameters:**

- `bits` (BitFieldResolvable) - Bit(s) to check for

**Returns:** Array<string> - Array of missing flag names

### toArray([has])

Gets an array of bitfield names based on the bits available.

```javascript
// Get all set flags
const setFlags = bf.toArray(); // or bf.toArray(true)
console.log(setFlags); // ['FLAG_ONE', 'FLAG_TWO']

// Get all unset flags
const unsetFlags = bf.toArray(false);
console.log(unsetFlags); // ['FLAG_THREE', ...]
```

**Parameters:**

- `has` (boolean) - Whether to show bits that are set (default: true)

**Returns:** Array<string> - Array of flag names

## Static Methods

### resolve(bit)

Resolves bitfields to their numeric form.

```javascript
// Resolve a flag name
const value1 = BitField.resolve("FLAG_ONE"); // 1n

// Resolve a numeric string (from API)
const value2 = BitField.resolve("123"); // 123n

// Resolve an array
const value3 = BitField.resolve(["FLAG_ONE", "FLAG_TWO"]); // 3n (1 | 2)

// Resolve another BitField
const other = new BitField("FLAG_ONE");
const value4 = BitField.resolve(other); // 1n
```

**Parameters:**

- `bit` (BitFieldResolvable) - Bit(s) to resolve

**Returns:** bigint

**Throws:** TypeError if bit cannot be resolved

## Example

````javascript
// Define custom flags
class CustomBitField extends BitField {}
CustomBitField.FLAGS = {
  READ: 1n << 0n,    // 1
  WRITE: 1n << 1n,   // 2
  EXECUTE: 1n << 2n, // 4
  ADMIN: 1n << 3n,   // 8
};

// Create instance
const perms = new CustomBitField(['READ', 'WRITE']);

// Check permissions
console.log(perms.has('READ'));     // true
console.log(perms.has('EXECUTE'));  // false
console.log(perms.any(['READ', 'EXECUTE'])); // true (has READ)

// Get missing permissions
const missing = perms.missing(['READ', 'WRITE', 'EXECUTE']);
console.log(missing); // ['EXECUTE']

// Get all set permissions
const setPerms = perms.toArray();
console.log(setPerms); // ['READ', 'WRITE']

// Get raw bitfield value
console.log(perms.bitfield); // 3n (1 | 2)

// Create from raw value
const fromRaw = new CustomBitField(7n); // 111 in binary
console.log(fromRaw.toArray()); // ['READ', 'WRITE', 'EXECUTE']
```
````
