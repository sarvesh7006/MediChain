const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readRecords, writeRecords } = require('../utils/fileHandler');

const dataFile = path.join(__dirname, '../data/users.json');

const User = {
  // Get all users
  find: async () => {
    return await readRecords(dataFile);
  },
  
  // Get a specific user by ID
  findById: async (id) => {
    const users = await readRecords(dataFile);
    return users.find(u => u.id === id);
  },
  
  // Create a new user
  create: async (userData) => {
    const users = await readRecords(dataFile);
    const newUser = { id: uuidv4(), ...userData, createdAt: new Date().toISOString() };
    users.push(newUser);
    await writeRecords(dataFile, users);
    return newUser;
  },

  // Delete a user
  findByIdAndDelete: async (id) => {
    let users = await readRecords(dataFile);
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    if (users.length < initialLength) {
      await writeRecords(dataFile, users);
      return true;
    }
    return false;
  }
};

module.exports = User;
