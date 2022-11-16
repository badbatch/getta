[Documentation](../README.md) › [FetchResponse](fetchresponse.md)

# Interface: FetchResponse ‹**Resource**›

## Type parameters

▪ **Resource**

## Hierarchy

* [ResponseDataWithErrors](responsedatawitherrors.md)‹Resource›

* [Response](fetchresponse.md#response)

  ↳ **FetchResponse**

## Index

### Properties

* [Response](fetchresponse.md#response)
* [body](fetchresponse.md#body)
* [bodyUsed](fetchresponse.md#bodyused)
* [data](fetchresponse.md#optional-data)
* [errors](fetchresponse.md#optional-errors)
* [headers](fetchresponse.md#headers)
* [ok](fetchresponse.md#ok)
* [redirected](fetchresponse.md#redirected)
* [status](fetchresponse.md#status)
* [statusText](fetchresponse.md#statustext)
* [trailer](fetchresponse.md#trailer)
* [type](fetchresponse.md#type)
* [url](fetchresponse.md#url)

### Methods

* [arrayBuffer](fetchresponse.md#arraybuffer)
* [blob](fetchresponse.md#blob)
* [clone](fetchresponse.md#clone)
* [formData](fetchresponse.md#formdata)
* [json](fetchresponse.md#json)
* [text](fetchresponse.md#text)

## Properties

###  Response

• **Response**: *object*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12829

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.webworker.d.ts:2882

#### Type declaration:

* **new __type**(`body?`: BodyInit | null, `init?`: ResponseInit): *[Response](fetchresponse.md#response)*

* **prototype**: *[Response](fetchresponse.md#response)*

* **error**(): *[Response](fetchresponse.md#response)*

* **redirect**(`url`: string, `status?`: undefined | number): *[Response](fetchresponse.md#response)*

___

###  body

• **body**: *ReadableStream‹Uint8Array› | null*

*Inherited from [FetchResponse](fetchresponse.md).[body](fetchresponse.md#body)*

*Overrides [FetchResponse](fetchresponse.md).[body](fetchresponse.md#body)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2531

___

###  bodyUsed

• **bodyUsed**: *boolean*

*Inherited from [FetchResponse](fetchresponse.md).[bodyUsed](fetchresponse.md#bodyused)*

*Overrides [FetchResponse](fetchresponse.md).[bodyUsed](fetchresponse.md#bodyused)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2532

___

### `Optional` data

• **data**? : *Resource*

*Inherited from [FetchResponse](fetchresponse.md).[data](fetchresponse.md#optional-data)*

*Defined in [src/types.ts:66](https://github.com/badbatch/getta/blob/51b6e0a/src/types.ts#L66)*

___

### `Optional` errors

• **errors**? : *Error[]*

*Inherited from [FetchResponse](fetchresponse.md).[errors](fetchresponse.md#optional-errors)*

*Defined in [src/types.ts:67](https://github.com/badbatch/getta/blob/51b6e0a/src/types.ts#L67)*

___

###  headers

• **headers**: *Headers*

*Inherited from [FetchResponse](fetchresponse.md).[headers](fetchresponse.md#headers)*

*Overrides [FetchResponse](fetchresponse.md).[headers](fetchresponse.md#headers)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12818

___

###  ok

• **ok**: *boolean*

*Inherited from [FetchResponse](fetchresponse.md).[ok](fetchresponse.md#ok)*

*Overrides [FetchResponse](fetchresponse.md).[ok](fetchresponse.md#ok)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12819

___

###  redirected

• **redirected**: *boolean*

*Inherited from [FetchResponse](fetchresponse.md).[redirected](fetchresponse.md#redirected)*

*Overrides [FetchResponse](fetchresponse.md).[redirected](fetchresponse.md#redirected)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12820

___

###  status

• **status**: *number*

*Inherited from [FetchResponse](fetchresponse.md).[status](fetchresponse.md#status)*

*Overrides [FetchResponse](fetchresponse.md).[status](fetchresponse.md#status)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12821

___

###  statusText

• **statusText**: *string*

*Inherited from [FetchResponse](fetchresponse.md).[statusText](fetchresponse.md#statustext)*

*Overrides [FetchResponse](fetchresponse.md).[statusText](fetchresponse.md#statustext)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12822

___

###  trailer

• **trailer**: *Promise‹Headers›*

*Inherited from [FetchResponse](fetchresponse.md).[trailer](fetchresponse.md#trailer)*

*Overrides [FetchResponse](fetchresponse.md).[trailer](fetchresponse.md#trailer)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12823

___

###  type

• **type**: *ResponseType*

*Inherited from [FetchResponse](fetchresponse.md).[type](fetchresponse.md#type)*

*Overrides [FetchResponse](fetchresponse.md).[type](fetchresponse.md#type)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12824

___

###  url

• **url**: *string*

*Inherited from [FetchResponse](fetchresponse.md).[url](fetchresponse.md#url)*

*Overrides [FetchResponse](fetchresponse.md).[url](fetchresponse.md#url)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12825

## Methods

###  arrayBuffer

▸ **arrayBuffer**(): *Promise‹ArrayBuffer›*

*Inherited from [FetchResponse](fetchresponse.md).[arrayBuffer](fetchresponse.md#arraybuffer)*

*Overrides [FetchResponse](fetchresponse.md).[arrayBuffer](fetchresponse.md#arraybuffer)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2533

**Returns:** *Promise‹ArrayBuffer›*

___

###  blob

▸ **blob**(): *Promise‹Blob›*

*Inherited from [FetchResponse](fetchresponse.md).[blob](fetchresponse.md#blob)*

*Overrides [FetchResponse](fetchresponse.md).[blob](fetchresponse.md#blob)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2534

**Returns:** *Promise‹Blob›*

___

###  clone

▸ **clone**(): *[Response](fetchresponse.md#response)*

*Inherited from [FetchResponse](fetchresponse.md).[clone](fetchresponse.md#clone)*

*Overrides [FetchResponse](fetchresponse.md).[clone](fetchresponse.md#clone)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:12826

**Returns:** *[Response](fetchresponse.md#response)*

___

###  formData

▸ **formData**(): *Promise‹FormData›*

*Inherited from [FetchResponse](fetchresponse.md).[formData](fetchresponse.md#formdata)*

*Overrides [FetchResponse](fetchresponse.md).[formData](fetchresponse.md#formdata)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2535

**Returns:** *Promise‹FormData›*

___

###  json

▸ **json**(): *Promise‹any›*

*Inherited from [FetchResponse](fetchresponse.md).[json](fetchresponse.md#json)*

*Overrides [FetchResponse](fetchresponse.md).[json](fetchresponse.md#json)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2536

**Returns:** *Promise‹any›*

___

###  text

▸ **text**(): *Promise‹string›*

*Inherited from [FetchResponse](fetchresponse.md).[text](fetchresponse.md#text)*

*Overrides [FetchResponse](fetchresponse.md).[text](fetchresponse.md#text)*

Defined in node_modules/typedoc/node_modules/typescript/lib/lib.dom.d.ts:2537

**Returns:** *Promise‹string›*
