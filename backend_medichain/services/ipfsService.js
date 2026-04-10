const { create } = require('ipfs-http-client');

class IPFSService {
  constructor() {
    try {
      // Connect to local IPFS node or Infura
      this.client = create({ url: process.env.IPFS_URL || 'http://127.0.0.1:5001' });
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
    }
  }

  /**
   * Upload binary data or text to IPFS
   * @param {Buffer|String} data 
   * @returns {string} IPFS CID
   */
  async uploadData(data) {
    try {
      const added = await this.client.add(data);
      return added.path; // This is the CID string
    } catch (error) {
      console.error('IPFS Upload Error:', error);
      throw new Error('Failed to upload data to IPFS');
    }
  }

  /**
   * Retrieves data from IPFS given a CID
   * @param {string} cid 
   * @returns {Buffer} The raw data buffer
   */
  async retrieveData(cid) {
    try {
      const chunks = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`IPFS Retrieval Error for CID ${cid}:`, error);
      throw new Error('Failed to retrieve data from IPFS');
    }
  }
}

module.exports = new IPFSService();
