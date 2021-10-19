import { PlainObject } from "@repodog/types";

export const ARRAY_BUFFER_FORMAT = "arrayBuffer" as const;
export const BLOB_FORMAT = "blob" as const;
export const FORM_DATA_FORMAT = "formData" as const;
export const JSON_FORMAT = "json" as const;
export const TEXT_FORMAT = "text" as const;

export const STREAM_READERS = {
  ARRAY_BUFFER_FORMAT,
  BLOB_FORMAT,
  FORM_DATA_FORMAT,
  JSON_FORMAT,
  TEXT_FORMAT,
};

export const DEFAULT_BODY_PARSER = (body: PlainObject) => body;
export const DEFAULT_FETCH_TIMEOUT = 5000 as const;
export const DEFAULT_HEADERS = { "content-type": "application/json" };
export const DEFAULT_MAX_REDIRECTS = 5 as const;
export const DEFAULT_MAX_RETRIES = 3 as const;
export const DEFAULT_PATH_TEMPLATE_REGEX = /({type})|({id})|({id,\+})|({brief\|standard})/g;
export const DEFAULT_REQUEST_RETRY_WAIT = 100;

export const MISSING_BASE_PATH_ERROR = `Getta expected to receive 'basePath' in the constructor options,
  but recevied undefined.`;

export const MAX_REDIRECTS_EXCEEDED_ERROR = "The request exceeded the maximum number of redirects, which is";

export const MAX_RETRIES_EXCEEDED_ERROR = "The request exceeded the maximum number of retries, which is";

export const INVALID_FETCH_METHOD_ERROR = "Getta expected to receive 'get', 'post', 'put' or 'delete', but received";

export const RESOURCE_NOT_FOUND_ERROR = "The requested resource could not been found.";

export const FETCH_TIMEOUT_ERROR = "The request timed out. Getta did not get a response within";

export const GET_METHOD = "get" as const;
export const POST_METHOD = "post" as const;
export const PUT_METHOD = "put" as const;
export const DELETE_METHOD = "delete" as const;

export const FETCH_METHODS = [GET_METHOD, POST_METHOD, PUT_METHOD, DELETE_METHOD];

export const INFORMATION_REPSONSE = "information" as const;
export const SUCCESSFUL_REPSONSE = "successful" as const;
export const REDIRECTION_REPSONSE = "redirection" as const;
export const CLIENT_ERROR_REPSONSE = "clientError" as const;
export const SERVER_ERROR_REPSONSE = "serverError" as const;

export const NOT_MODIFIED_STATUS_CODE = 304 as const;
export const NOT_FOUND_STATUS_CODE = 404 as const;

export const COOKIE_HEADER = "Cookie" as const;
export const ETAG_HEADER = "ETag" as const;
export const LOCATION_HEADER = "Location" as const;
export const IF_NONE_MATCH_HEADER = "If-None-Match" as const;
export const CACHE_CONTROL_HEADER = "Cache-Control" as const;
