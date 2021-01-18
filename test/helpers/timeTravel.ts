import { JsonRpcProvider } from '@ethersproject/providers';

export async function mineBlock(provider: JsonRpcProvider): Promise<void> {
	await provider.send('evm_mine', []);
}
