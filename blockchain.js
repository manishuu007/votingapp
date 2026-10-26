// ============================================================
//  BLOCKCHAIN.JS — Core Blockchain Implementation
//  CYBERSECURITY CONCEPT: Immutable ledger using SHA-256 hashing
// ============================================================

/**
 * SHA-256 Hash using Web Crypto API
 * SECURITY: One-way function — impossible to reverse-engineer original data
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * BLOCK — A single unit in the blockchain
 * SECURITY CONCEPT:
 *   - Each block stores the hash of the previous block (previousHash)
 *   - This creates a chain: if any block is altered, ALL subsequent hashes break
 *   - This is called "Chain of Trust" or "Tamper Evidence"
 */
class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;               // Block number
    this.timestamp = timestamp;       // When the block was created
    this.data = data;                 // The vote data stored in this block
    this.previousHash = previousHash; // Hash of the previous block (links chain)
    this.hash = '';                   // This block's own hash (calculated)
    this.nonce = 0;                   // Proof of Work counter
  }

  /**
   * Calculate this block's hash
   * Input: all block properties concatenated as a string
   * Output: 64-character hex string (SHA-256)
   */
  async calculateHash() {
    const content = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash + this.nonce;
    return await sha256(content);
  }

  /**
   * PROOF OF WORK (PoW)
   * SECURITY CONCEPT: Makes it computationally expensive to tamper with blocks
   * The miner must find a hash that starts with 'difficulty' number of zeros
   * This is the same concept used in Bitcoin!
   */
  async mineBlock(difficulty = 2) {
    const target = Array(difficulty + 1).join('0');
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = await this.calculateHash();
    }
    console.log(`Block ${this.index} mined: ${this.hash}`);
  }
}

/**
 * BLOCKCHAIN — A chain of blocks
 * SECURITY CONCEPTS:
 *   1. Genesis Block — the very first block (no previous block)
 *   2. Chain Validation — any tampering is detected by checking hashes
 *   3. Immutability — once a block is added, the chain makes alteration detectable
 */
class Blockchain {
  constructor() {
    this.chain = [];
    this.difficulty = 2; // Number of leading zeros required in hash (PoW difficulty)
  }

  async init() {
    const saved = this.loadFromStorage();
    if (saved && saved.length > 0) {
      this.chain = saved;
    } else {
      await this.createGenesisBlock();
    }
  }

  /**
   * GENESIS BLOCK — The first block in any blockchain
   * It has no previous block, so previousHash = "0"
   */
  async createGenesisBlock() {
    const genesis = new Block(0, new Date().toISOString(), { type: 'GENESIS', message: 'VoteChain Genesis Block' }, '0');
    genesis.hash = await genesis.calculateHash();
    this.chain = [genesis];
    this.saveToStorage();
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * ADD VOTE BLOCK
   * Each vote is recorded as a new block
   * The block contains: voter ID hash (not raw ID!), votes, timestamp
   */
  async addVoteBlock(voterId, votes) {
    // SECURITY: We store a hash of the voter ID, not the raw ID
    // This preserves anonymity while preventing double voting
    const voterIdHash = await sha256(voterId + 'salt_votechain_2024');

    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      {
        type: 'VOTE',
        voterIdHash: voterIdHash, // Anonymized voter identifier
        votes: votes,             // The actual votes cast
        timestamp: Date.now()
      },
      this.getLatestBlock().hash   // Link to previous block
    );

    await newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.saveToStorage();
    return newBlock;
  }

  /**
   * CHAIN VALIDATION
   * SECURITY CONCEPT: Detect any tampering in the blockchain
   * Steps:
   *   1. Recalculate each block's hash
   *   2. If recalculated hash ≠ stored hash → TAMPERED
   *   3. If block's previousHash ≠ previous block's hash → CHAIN BROKEN
   */
  async isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Recalculate hash and compare
      const recalculated = await new Block(
        current.index, current.timestamp, current.data, current.previousHash
      ).calculateHash();

      if (current.hash !== recalculated) {
        console.warn(`Block ${i} has been tampered!`);
        return false;
      }

      // Check chain linkage
      if (current.previousHash !== previous.hash) {
        console.warn(`Block ${i} is not properly linked!`);
        return false;
      }
    }
    return true;
  }

  /**
   * TALLY VOTES
   * Count all votes from all VOTE-type blocks
   */
  tallyVotes() {
    const tally = {};
    this.chain.forEach(block => {
      if (block.data && block.data.type === 'VOTE') {
        const votes = block.data.votes;
        for (const [category, candidate] of Object.entries(votes)) {
          if (!tally[category]) tally[category] = {};
          tally[category][candidate] = (tally[category][candidate] || 0) + 1;
        }
      }
    });
    return tally;
  }

  /**
   * GET VOTED VOTERS (hashed IDs)
   * To check if a voter has already voted — without revealing identity
   */
  getVotedHashes() {
    return this.chain
      .filter(b => b.data && b.data.type === 'VOTE')
      .map(b => b.data.voterIdHash);
  }

  getTotalVoters() {
    return this.chain.filter(b => b.data && b.data.type === 'VOTE').length;
  }

  // Persist to localStorage (no database needed!)
  saveToStorage() {
    localStorage.setItem('votechain_blockchain', JSON.stringify(this.chain));
  }

  loadFromStorage() {
    const data = localStorage.getItem('votechain_blockchain');
    return data ? JSON.parse(data) : null;
  }

  reset() {
    localStorage.removeItem('votechain_blockchain');
  }
}

// Global blockchain instance
const blockchain = new Blockchain();