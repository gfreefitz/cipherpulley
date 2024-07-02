const axios = require('axios');
const msgpack = require('msgpack-lite');

const email = 'gfreefitz@gmail.com';
const baseUrl = 'https://ciphersprint.pulley.com/';

const fetchData = async (url) => {
    let nextUrl = url;

    try {
        while (nextUrl) {

            console.log("Trying %s", nextUrl);

            const response = await axios.get(nextUrl);
            const data = response.data;

            console.log("Level %d", response.data.level);
            console.log("---------------------");

            Object.keys(data).forEach(key => {
                console.log(`${key}: ${data[key]}`);
            });

            let path = data.encrypted_path.slice(5);

            switch (response.data.encryption_method) {
                case 'hex decoded, encrypted with XOR, hex encoded again. key: secret':
                    path = xorDecrypt(path, 'secret');
                    break;
                case 'swapped every pair of characters':
                    path = swapEveryOtherCharacter(path);
                    break;
                case 'encoded as base64':
                    path = Buffer.from(path, 'base64').toString('utf-8');
                    break;
                case 'nothing':
                    path = path;
                    break;
                default:
                    if (response.data.encryption_method.startsWith('scrambled! original positions as base64 encoded messagepack: ')) {
                        const scrambledInfo = response.data.encryption_method.split(': ')[1];
                        path = unscramblePath(path, scrambledInfo);
                    } else {
                        const match = response.data.encryption_method.match(/circularly rotated left by (\d+)/);
                        if (match) {
                            const rotateBy = parseInt(match[1], 10);
                            path = circularRotateLeft(path, rotateBy);
                        } else {
                            console.log("Unknown encryption method: '%s'", response.data.encryption_method);
                            nextUrl = '';
                            return;
                        }
                        break;
                    }
            }

            nextUrl = baseUrl + 'task_' + path;
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
};

fetchData(baseUrl + email);

// The provided JavaScript function, swapEveryOtherCharacter, is designed to
// take a string (str) as its input and return a new string where every pair of
// adjacent characters are swapped. The function works as follows:
//
// 1. Splitting the String into Characters: The function begins by converting
// the input string into an array of individual characters using the
// str.split('') method. This is necessary because strings in JavaScript are
// immutable, meaning they cannot be changed after they are created.
// By converting the string to an array, we can manipulate the characters
// (e.g., swap them) directly.
//
// 2. Swapping Characters in Pairs: The function then enters a loop that
// iterates over the array of characters. The loop uses a variable i to keep
// track of the current position in the array, starting from 0 (the first character)
// and incrementing by 2 after each iteration. This step size of 2 ensures that
// the loop processes characters in pairs, skipping every second character to
// treat the string as a series of character pairs.
//
// Inside the loop, a temporary variable temp is used to store the character
// at the current position i. This is necessary because the swapping operation
// involves temporarily losing one of the values being swapped. After storing
// the character in temp, the character at position i is replaced with the
// character at position i + 1 (effectively moving the second character of the
// pair into the first position). Then, the character that was originally at
// position i (and is now stored in temp) is placed in position i + 1.
// This completes the swap of the two characters.
//
// 3. Handling the Loop Condition: The loop continues as long as i < chars.length - 1.
// This condition ensures that the loop does not attempt to swap characters beyond
// the end of the array. Since the swapping operation requires accessing i + 1,
// we must stop the loop one character before the last to avoid accessing an index
// outside the bounds of the array.
//
// 4. Rejoining the Characters: After all applicable pairs of characters have
// been swapped, the array of characters is converted back into a string using
// the join('') method. This method concatenates all elements of the array into
// a single string, with each element directly adjacent to the next, effectively
// reversing the initial split('') operation.
//
// 5. Returning the Result: Finally, the function returns the newly formed
// string, which contains the original characters with every adjacent pair swapped.
//
// This function is useful for string manipulation tasks where the order of
// characters needs to be altered in a specific, patterned way.

function swapEveryOtherCharacter(str) {
    const chars = str.split('');
    for (let i = 0; i < chars.length - 1; i += 2) {
        const temp = chars[i];
        chars[i] = chars[i + 1];
        chars[i + 1] = temp;
    }
    return chars.join('');
}

// The provided JavaScript function, circularRotateLeft, is designed to perform
// a left circular rotation on a string. This operation shifts each character
// in the string to the left by a specified number of positions, with the
// characters at the beginning of the string moving to the end to maintain the
// circular nature of the operation.
//
// The function takes two parameters: str, which is the string to be rotated,
// and num, which is the number of positions to rotate the string to the left.
//
// First, the function calculates the length of the input string str and stores
// it in the variable len. This value is used to determine the actual number of
// positions to rotate the string, ensuring that the rotation count is within
// the bounds of the string's length.
//
// The next step involves calculating the effective number of rotations needed,
// which is stored in the variable effectiveRotation. This is done by taking the
// modulus of num (the desired number of rotations) by len (the length of the string).
// The modulus operation ensures that if the number of rotations exceeds the
// length of the string, the rotation count wraps around. For example, rotating
// a 5-character string by 7 positions effectively results in a 2-position rotation,
// as the first 5 rotations would return the string to its original configuration.
//
// However, instead of directly performing a left rotation, the function calculates
// a reverseRotation value, which represents how many positions to rotate the
// string to the right to achieve the same effect as the desired left rotation.
// This is calculated by subtracting effectiveRotation from len, the length of
// the string.
//
// Finally, the function performs the rotation by slicing the string into two
// parts and then concatenating them in reverse order. It uses the str.slice
// method twice: first, to get the substring from reverseRotation to the end
// of the string, and second, to get the substring from the beginning of the
// string to reverseRotation. By concatenating these two slices in this order,
// the function effectively rotates the string to the left by the desired number
// of positions and returns the result.
//
// This approach to rotating a string is efficient and takes into consideration
// cases where the number of rotations exceeds the length of the string, ensuring
// the operation is always valid and produces the expected outcome.

function circularRotateLeft(str, num) {
    const len = str.length;
    const effectiveRotation = num % len;
    const reverseRotation = len - effectiveRotation;
    return str.slice(reverseRotation) + str.slice(0, reverseRotation);
}

// The provided JavaScript function, xorDecrypt, is designed to decrypt a
// hexadecimal string (hexStr) using a given key (key) through the XOR
// (exclusive or) operation. This function is particularly useful in scenarios
// where simple encryption and decryption are needed, such as in basic data
// obfuscation or in certain cryptographic applications.
//
// The function begins by converting the input hexadecimal string (hexStr) into
// a binary buffer (hexDecoded) using Buffer.from(hexStr, 'hex'). This
// conversion is necessary because the XOR operation works at the binary level,
// and handling the data as a buffer allows for byte-wise manipulation.
//
// Similarly, the key provided as a string is also converted into a binary
// buffer (keyBuffer) using Buffer.from(key). This conversion ensures that the
// key can be applied to the binary data of the hexadecimal string in a
// byte-wise manner.
//
// An output buffer (output) is then allocated with the same length as the
// hexDecoded buffer. This buffer will store the result of the XOR operation
// between the hexadecimal string and the key. The allocation is done using
// Buffer.alloc(hexDecoded.length), which initializes a buffer of the specified
// length filled with zeros.
//
// The function then iterates over each byte of the hexDecoded buffer. For each
// byte, it performs the XOR operation with the corresponding byte from the
// keyBuffer. The correspondence is determined by the modulo operation
// (i % keyBuffer.length), which ensures that if the key is shorter than the
// data, the key bytes are reused in a cyclic manner. The result of the XOR
// operation for each byte is stored in the corresponding position in the output
// buffer.
//
// Finally, the function returns the output buffer converted back into a
// hexadecimal string using output.toString('hex'). This conversion is the
// reverse of the initial conversion of the input hexadecimal string into a
// binary buffer, thus producing a hexadecimal representation of the decrypted
// data.
//
// This function exemplifies a straightforward implementation of XOR
// encryption/decryption, showcasing how buffers can be used in Node.js for
// binary data manipulation and the application of bitwise operations for
// cryptographic purposes.

function xorDecrypt(hexStr, key) {
    const hexDecoded = Buffer.from(hexStr, 'hex');
    const keyBuffer = Buffer.from(key);
    const output = Buffer.alloc(hexDecoded.length);

    for (let i = 0; i < hexDecoded.length; i++) {
        output[i] = hexDecoded[i] ^ keyBuffer[i % keyBuffer.length];
    }

    return output.toString('hex');
}

// The provided JavaScript function, unscramblePath, is designed to decode or
// unscramble a given string (path) based on a set of scrambled information
// (scrambledInfo). This function is particularly useful in scenarios where data
// needs to be securely transmitted or stored in a scrambled format and then
// decoded back to its original form.

// The function starts by decoding the scrambledInfo parameter. This parameter
// is expected to be a base64 encoded string that, when decoded, reveals the
// positions of characters in the original unscrambled string. The decoding is
// achieved using the msgpack.decode method, which decodes the base64 encoded
// string (converted to a buffer using Buffer.from(scrambledInfo, 'base64'))
// into an array of positions. The msgpack library is used here for its efficient
// binary serialization and deserialization capabilities.

// Next, the function initializes an array, chars, with a length equal to that
// of the path parameter. This array is intended to hold the characters of the
// unscrambled string in their correct positions.

// The function then iterates over the positions array using a for loop.
// For each iteration, it assigns the character from the path string at the
// current index i to the position in the chars array specified by positions[i].
// This step effectively rearranges the characters of the path string into their
// original, unscrambled order based on the positions specified in the scrambledInfo.

// Finally, the function returns the unscrambled string by joining the elements
// of the chars array into a single string using the join('') method. This method
// concatenates all elements of the array, effectively reconstructing the original
// unscrambled string.

// In summary, unscramblePath is a function that takes a scrambled string and a
// piece of information describing how it was scrambled, then reconstructs and
// returns the original unscrambled string. This is particularly useful in
// applications where data needs to be securely scrambled and later unscrambled
// without losing the integrity of the original data.

function unscramblePath(path, scrambledInfo) {
    const positions = msgpack.decode(Buffer.from(scrambledInfo, 'base64'));
    const chars = Array(path.length);
    for (let i = 0; i < positions.length; i++) {
        chars[positions[i]] = path[i];
    }
    return chars.join('');
}