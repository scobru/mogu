/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {StorageService} from './base-storage';
import type {UploadOutput} from '../types';
import * as fsHelper from './helpers/fsHelper';
import lighthouse from '@lighthouse-web3/sdk';

export class LighthouseStorageService extends StorageService {
	public serviceBaseUrl = 'ipfs://';
	public readonly serviceInstance: any;
	public readonly apiKey: string;

	constructor(apiKey: string, config: any) {
		super();
		this.serviceInstance = lighthouse;
		this.apiKey = apiKey;
	}

	public async uploadJson(jsonData: Record<string, unknown>, options?: any): Promise<UploadOutput> {
		await fsHelper.writeFile('./webstash-tmp/lighthouse.json', JSON.stringify(jsonData));
		const response = await lighthouse.upload('./webstash-tmp/lighthouse.json', this.apiKey);
		await fsHelper.deleteFile('./webstash-tmp');
		return {id: response.data.Hash, metadata: {...response}};
	}

	public async uploadImage(path: string, options?: any): Promise<UploadOutput> {
		const response = await lighthouse.upload(path, this.apiKey);
		return {id: response.data.Hash, metadata: {...response}};
	}

	public async uploadVideo(path: string, options?: any): Promise<UploadOutput> {
		const response = await lighthouse.upload(path, this.apiKey);
		return {id: response.data.Hash, metadata: {...response}};
	}

	public async uploadFile(path: string, options?: any): Promise<UploadOutput> {
		const response = await lighthouse.upload(path, this.apiKey);
		return {id: response.data.Hash, metadata: {...response}};
	}

	public async unpin(hash: string): Promise<void> {
		throw new Error('Unpin not directly supported on Lighthouse');
	}
}
