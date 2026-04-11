const crypto = require('crypto');

// ---------------------------------------------------------------------------
// In-memory IPFS mock store
// ---------------------------------------------------------------------------
const mockIpfsStore = {}; // cid -> Buffer

function generateMockCid(data) {
  // Deterministic fake CID based on content hash
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return 'Qm' + hash.slice(0, 44); // Looks like a real CIDv0
}

// ---------------------------------------------------------------------------
class IPFSService {
  constructor() {
    this.client    = null;
    this.isMockMode = false;

    const ipfsUrl = process.env.IPFS_URL || 'http://127.0.0.1:5001';

    try {
      // Dynamically require so startup doesn't crash if ipfs-http-client has issues
      const { create } = require('ipfs-http-client');
      this.client = create({ url: ipfsUrl });
      console.log('IPFSService -- connected to', ipfsUrl);
    } catch (error) {
      this.isMockMode = true;
      console.log('IPFSService -- MOCK MODE (ipfs-http-client unavailable)');
    }
  }

  /**
   * Upload binary data or text to IPFS (or mock store)
   * @param {Buffer|String} data
   * @returns {string} IPFS CID
   */
  async uploadData(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (this.isMockMode || !this.client) {
      const cid = generateMockCid(buffer);
      mockIpfsStore[cid] = buffer;
      console.log('[MOCK IPFS] Stored', buffer.length, 'bytes -> CID:', cid.slice(0, 20) + '...');
      return cid;
    }

    try {
      const added = await this.client.add(buffer);
      return added.path;
    } catch (error) {
      // Fallback to mock if real IPFS node is unreachable
      console.warn('IPFS node unreachable, falling back to mock store:', error.message);
      const cid = generateMockCid(buffer);
      mockIpfsStore[cid] = buffer;
      return cid;
    }
  }

  /**
   * Retrieve data from IPFS (or mock store)
   * @param {string} cid
   * @returns {Buffer}
   */
  async retrieveData(cid) {
    // Always check mock store first (covers both full mock and fallback-stored CIDs)
    if (mockIpfsStore[cid]) {
      console.log('[MOCK IPFS] Retrieved CID:', cid.slice(0, 20) + '...');
      return mockIpfsStore[cid];
    }

    if (this.isMockMode || !this.client) {
      throw new Error('IPFS CID not found in mock store: ' + cid);
    }

    try {
      const chunks = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('IPFS Retrieval Error for CID', cid, ':', error.message);
      throw new Error('Failed to retrieve data from IPFS');
    }
  }
}

module.exports = new IPFSService();
