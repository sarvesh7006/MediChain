const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Use global fetch if available (Node 18+), otherwise use node-fetch
let fetchFn;
try {
  // Try using global fetch first (Node 18+)
  fetchFn = fetch;
} catch (e) {
  // Fallback to node-fetch for older Node versions
  try {
    const nodeFetch = require('node-fetch');
    fetchFn = nodeFetch.default || nodeFetch;
  } catch (err) {
    console.error('Failed to load fetch function:', err.message);
  }
}

// Helper to create multipart form data manually
function createFormData(buffer, fileName) {
  const boundary = '----PinataFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];
  
  // Add file part
  // pinataMetadata
  parts.push(`--${boundary}`);
  parts.push('Content-Disposition: form-data; name="pinataMetadata"');
  parts.push('Content-Type: application/json');
  parts.push('');
  parts.push(JSON.stringify({name: fileName, keyvalues: {app: 'MediChain', type: 'medical-report'}}));
  
  // pinataOptions
  parts.push(`--${boundary}`);
  parts.push('Content-Disposition: form-data; name="pinataOptions"');
  parts.push('Content-Type: application/json');
  parts.push('');
  parts.push(JSON.stringify({cidVersion: 1}));
  
  // file part
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"`);
  parts.push('Content-Type: application/octet-stream');
  parts.push('');
  
  const header = Buffer.from(parts.join('\r\n') + '\r\n');
  const footer = Buffer.from(`\r\n--${boundary}--`);
  
  const body = Buffer.concat([header, buffer, footer]);
  
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

// ---------------------------------------------------------------------------
// Pinata Service for IPFS file storage
// ---------------------------------------------------------------------------

class PinataService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
this.pinataApiSecret = process.env.PINATA_SECRET_API_KEY;
    this.pinataApiUrl = 'https://api.pinata.cloud';
    
if (!this.pinataApiKey || !this.pinataApiSecret) {
      console.warn('⚠️  PinataService: Using MOCK mode (no real IPFS uploads)');
      this.mockMode = true;
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
    if (this.mockMode) {
      // Mock CID for demo (consistent 34-char IPFS hash format)
      const mockCid = 'Qm' + 'X'.repeat(32) + fileName.slice(-8, -4).toUpperCase();
      console.log('📤 MOCK IPFS upload:', mockCid, '(' + fileName + ')');
      return mockCid;
    }
    if (!this.pinataApiKey || !this.pinataApiSecret) {
      throw new Error('Pinata API credentials not configured in .env');
    }

    try {
      console.log('📤 Uploading to Pinata:', fileName, '|', 'Size:', fileBuffer.length, 'bytes');

      // Create multipart form data manually
      const { body, contentType } = createFormData(fileBuffer, fileName);

      const response = await fetchFn(`${this.pinataApiUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataApiSecret,
          'Content-Type': contentType,
        },
        body: body,
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || response.statusText;
          console.error('Pinata API Error:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          const text = await response.text();
          console.error('Pinata API Response:', text);
        }
        throw new Error(`Pinata upload failed: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('✓ File uploaded to Pinata:', result.IpfsHash, '(' + fileName + ')');
      return result.IpfsHash;
    } catch (error) {
      console.error('❌ Pinata upload error:', error.message);
      console.error('Stack:', error.stack);
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
      const response = await fetchFn(`${this.pinataApiUrl}/pinning/pinJSONToIPFS`, {
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
      const response = await fetchFn(gatewayUrl);

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
