const fse = require('fs-extra');

/**
 * Reads records from a JSON file safely.
 * If the file does not exist, returns an empty array.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<Array|Object>} - Parsed JSON data or an empty array.
 */
const readRecords = async (filePath) => {
  try {
    const exists = await fse.pathExists(filePath);
    if (!exists) {
      return [];
    }
    const data = await fse.readJson(filePath);
    return data;
  } catch (error) {
    console.error(`Error reading from ${filePath}: ${error.message}`);
    // Return empty array to gracefully handle corrupted JSON or read errors
    return [];
  }
};

/**
 * Writes records to a JSON file.
 * Creates the file and any necessary directories if they do not exist.
 * @param {string} filePath - Path to the JSON file.
 * @param {Array|Object} data - Data to write to the file.
 * @returns {Promise<void>}
 */
const writeRecords = async (filePath, data) => {
  try {
    await fse.outputJson(filePath, data, { spaces: 2 });
  } catch (error) {
    console.error(`Error writing to ${filePath}: ${error.message}`);
    throw error; // Let the caller handle write errors explicitly
  }
};

module.exports = {
  readRecords,
  writeRecords
};
