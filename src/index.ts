import Gun from 'gun';
import { registerGunPlugins } from './plugins';

// Registra i plugin prima di usare Gun
registerGunPlugins();

// Esporta tutto il resto
export { Mogu, MoguOnChain, EncryptedNode, NodeType } from "./sdk/sdk";
