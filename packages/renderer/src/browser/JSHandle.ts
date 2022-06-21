/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Protocol} from 'devtools-protocol';
import {CDPSession} from './Connection';
import {EvaluateHandleFn, SerializableOrJSHandle} from './EvalTypes';
import {ExecutionContext} from './ExecutionContext';
import {releaseObject, valueFromRemoteObject} from './util';

export function _createJSHandle(
	context: ExecutionContext,
	remoteObject: Protocol.Runtime.RemoteObject
): JSHandle {
	const frame = context.frame();
	if (remoteObject.subtype === 'node' && frame) {
		return new ElementHandle(context, context._client, remoteObject);
	}

	return new JSHandle(context, context._client, remoteObject);
}

export class JSHandle {
	#client: CDPSession;
	#disposed = false;
	#context: ExecutionContext;
	#remoteObject: Protocol.Runtime.RemoteObject;

	get _client(): CDPSession {
		return this.#client;
	}

	get _disposed(): boolean {
		return this.#disposed;
	}

	get _remoteObject(): Protocol.Runtime.RemoteObject {
		return this.#remoteObject;
	}

	get _context(): ExecutionContext {
		return this.#context;
	}

	constructor(
		context: ExecutionContext,
		client: CDPSession,
		remoteObject: Protocol.Runtime.RemoteObject
	) {
		this.#context = context;
		this.#client = client;
		this.#remoteObject = remoteObject;
	}

	executionContext(): ExecutionContext {
		return this.#context;
	}

	async evaluateHandle<HandleType extends JSHandle = JSHandle>(
		pageFunction: EvaluateHandleFn,
		...args: SerializableOrJSHandle[]
	): Promise<HandleType> {
		return this.executionContext().evaluateHandle(pageFunction, this, ...args);
	}

	asElement(): ElementHandle | null {
		return null;
	}

	async dispose(): Promise<void> {
		if (this.#disposed) {
			return;
		}

		this.#disposed = true;
		await releaseObject(this.#client, this.#remoteObject);
	}

	toString(): string {
		if (this.#remoteObject.objectId) {
			const type = this.#remoteObject.subtype || this.#remoteObject.type;
			return 'JSHandle@' + type;
		}

		return 'JSHandle:' + valueFromRemoteObject(this.#remoteObject);
	}
}

export class ElementHandle<
	ElementType extends Element = Element
> extends JSHandle {
	override asElement(): ElementHandle<ElementType> | null {
		return this;
	}
}
