/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {StorageService} from './base-storage';
import type {UploadOutput} from '../types';
import type {Options as IpfsOptions} from 'ipfs-http-client';
import {create} from 'ipfs-http-client';
import {BackupData} from '../../types/mogu';

export class IpfsService extends StorageService {
	public serviceBaseUrl = 'ipfs://';
	public readonly serviceInstance: any;

	constructor(options: IpfsOptions) {
		super();
		this.serviceInstance = create(options);
	}

	public async get(hash: string): Promise<BackupData> {
		const chunks = [];
		for await (const chunk of this.serviceInstance.cat(hash)) {
			chunks.push(chunk);
		}
		const content = Buffer.concat(chunks).toString();
		return JSON.parse(content);
	}

	public async uploadJson(jsonData: Record<string, unknown>): Promise<UploadOutput> {
		const content = JSON.stringify(jsonData);
		const result = await this.serviceInstance.add(content);
		return {
			id: result.path,
			metadata: {
				size: result.size,
				type: 'json'
			}
		};
	}

	public async uploadFile(path: string): Promise<UploadOutput> {
		const result = await this.serviceInstance.add(path);
		return {
			id: result.path,
			metadata: {
				size: result.size,
				type: 'file'
			}
		};
	}

	public async uploadImage(path: string): Promise<UploadOutput> {
		return this.uploadFile(path);
	}

	public async uploadVideo(path: string): Promise<UploadOutput> {
		return this.uploadFile(path);
	}

	public async unpin(hash: string): Promise<void> {
		await this.serviceInstance.pin.rm(hash);
	}

	public async getMetadata(hash: string): Promise<any> {
		const stat = await this.serviceInstance.files.stat(`/ipfs/${hash}`);
		return stat;
	}

	public async isPinned(hash: string): Promise<boolean> {
		try {
			const pins = await this.serviceInstance.pin.ls({paths: [hash]});
			return pins.length > 0;
		} catch {
			return false;
		}
	}
}
