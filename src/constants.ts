import { type PlainObject } from './types.ts';

export const ARRAY_BUFFER_FORMAT = 'arrayBuffer';
export const BLOB_FORMAT = 'blob';
export const FORM_DATA_FORMAT = 'formData';
export const JSON_FORMAT = 'json';
export const TEXT_FORMAT = 'text';

export const STREAM_READERS = {
  ARRAY_BUFFER_FORMAT,
  BLOB_FORMAT,
  FORM_DATA_FORMAT,
  JSON_FORMAT,
  TEXT_FORMAT,
};

export const DEFAULT_BODY_PARSER = (body: PlainObject) => body;
export const DEFAULT_FETCH_TIMEOUT = 5000;
export const DEFAULT_HEADERS = { 'content-type': 'application/json' };
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_PATH_TEMPLATE_REGEX = /({type})|({id})|({id,\+})|({brief\|standard})/g;
export const OPTIONAL_PATH_TEMPLATE_REGEX = /({\w+\?})/g;
export const DEFAULT_RATE_LIMIT = 50;
export const DEFAULT_REQUEST_RETRY_WAIT = 100;

export const MISSING_BASE_PATH_ERROR = `Getta expected to receive 'basePath' in the constructor options,
  but recevied undefined.`;

export const MAX_REDIRECTS_EXCEEDED_ERROR = 'The request exceeded the maximum number of redirects, which is';

export const MAX_RETRIES_EXCEEDED_ERROR = 'The request exceeded the maximum number of retries, which is';

export const INVALID_FETCH_METHOD_ERROR = "Getta expected to receive 'get', 'post', 'put' or 'delete', but received";

export const RESOURCE_NOT_FOUND_ERROR = 'The requested resource could not been found.';

export const FETCH_TIMEOUT_ERROR = 'The request timed out. Getta did not get a response within';

export const GET_METHOD = 'get';
export const POST_METHOD = 'post';
export const PUT_METHOD = 'put';
export const DELETE_METHOD = 'delete';

export const FETCH_METHODS = [GET_METHOD, POST_METHOD, PUT_METHOD, DELETE_METHOD];

export const INFORMATION_REPSONSE = 'information';
export const SUCCESSFUL_REPSONSE = 'successful';
export const REDIRECTION_REPSONSE = 'redirection';
export const CLIENT_ERROR_REPSONSE = 'clientError';
export const SERVER_ERROR_REPSONSE = 'serverError';

export const NOT_MODIFIED_STATUS_CODE = 304;
export const NOT_FOUND_STATUS_CODE = 404;

export const COOKIE_HEADER = 'Cookie';
export const ETAG_HEADER = 'ETag';
export const LOCATION_HEADER = 'Location';
export const IF_NONE_MATCH_HEADER = 'If-None-Match';
export const CACHE_CONTROL_HEADER = 'Cache-Control';

export const REQUEST_SENT = 'request_sent';
export const RESPONSE_RECEIVED = 'response_received';
export const RESPONSE_FROM_CACHE = 'response_from_cache';
export const REQUEST_FAILED = 'request_failed';
