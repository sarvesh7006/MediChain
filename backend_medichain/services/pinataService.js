const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Pinata Service for IPFS file storage
// ---------------------------------------------------------------------------

class PinataService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataApiSecret = process.env.PINATA_API_SECRET;
    this.pinataApiUrl = 'https://api.pinata.cloud';
    
    if (!this.pinataApiKey || !this.pinataApiSecret) {
      console.warn('⚠️  PinataService: Missing PINATA_API_KEY or PINATA_API_SECRET in .env');
      console.warn('   File uploads will fail. Please add these to your .env file.');
    } else {
      console.log('✓ PinataService initialized with Pinata API credentials');
    }
  }

  /**
   * Upload file to Pinata IPFS
   * @param {Buffer|Stream} fileBuffer - The file buffer or stream
   * @param {string} fileName - The name of the file
   * @returns {Promise<string>} - The IPFS hash (CID)
   */
  async uploadFile(fileBuffer, fileName) {
    if (!this.pinataApiKey || !this.pinataApiSecret) {
      throw new Error('Pinata API credentials not configured in .env');
    }

    try {
      const form = new FormData();
      form.append('file', fileBuffer, fileName);

      const response = await fetch(`${this.pinataApiUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataApiSecret,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pinata upload failed: ${error.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✓ File uploaded to Pinata:', result.IpfsHash, '(' + fileName + ')');
      return result.IpfsHash;
    } catch (error) {
      console.error('❌ Pinata upload error:', error.message);
      throw new Error('Failed to upload file to Pinata: ' + error.message);
    }
  }

  /**
   * Upload JSON data to Pinata IPFS
   * @param {Object} jsonData - The JSON object to upload
   * @param {string} fileName - Name for the JSON file (optional)
   * @returns {Promise<string>} - The IPFS hash (CID)
   */
  async uploadJson(jsonData, fileName = 'data.json') {
    if (!this.pinataApiKey || !this.pinataApiSecret) {
      throw new Error('Pinata API credentials not configured in .env');
    }

    try {
      const jsonString = JSON.stringify(jsonData);
      const response = await fetch(`${this.pinataApiUrl}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataApiSecret,
        },
        body: jsonString,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pinata upload failed: ${error.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✓ JSON uploaded to Pinata:', result.IpfsHash, '(' + fileName + ')');
      return result.IpfsHash;
    } catch (error) {
      console.error('❌ Pinata JSON upload error:', error.message);
      throw new Error('Failed to upload JSON to Pinata: ' + error.message);
    }
  }

  /**
   * Retrieve file from Pinata/IPFS gateway
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {Promise<Buffer>} - The file buffer
   */
  async retrieveFile(ipfsHash) {
    try {
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      console.log('✓ File retrieved from Pinata gateway:', ipfsHash);
      return buffer;
    } catch (error) {
      console.error('❌ Pinata retrieval error:', error.message);
      throw new Error('Failed to retrieve file from Pinata: ' + error.message);
    }
  }

  /**
   * Retrieve JSON data from Pinata/IPFS gateway
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {Promise<Object>} - The parsed JSON object
   */
  async retrieveJson(ipfsHash) {
    try {
      const buffer = await this.retrieveFile(ipfsHash);
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      console.log('✓ JSON retrieved from Pinata gateway:', ipfsHash);
      return jsonData;
    } catch (error) {
      console.error('❌ Pinata JSON retrieval error:', error.message);
      throw new Error('Failed to retrieve JSON from Pinata: ' + error.message);
    }
  }

  /**
   * Get Pinata gateway URL for a file
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {string} - The full gateway URL
   */
  getGatewayUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

module.exports = new PinataService();
