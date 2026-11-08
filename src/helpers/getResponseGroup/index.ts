import * as consts from '../../constants.ts';

export const getResponseGroup = (status: number): string => {
  switch (true) {
    case status < 200: {
      return consts.INFORMATION_RESPONSE;
    }

    case status < 300: {
      return consts.SUCCESSFUL_RESPONSE;
    }

    case status < 400: {
      return consts.REDIRECTION_RESPONSE;
    }

    case status < 500: {
      return consts.CLIENT_ERROR_RESPONSE;
    }

    default: {
      return consts.SERVER_ERROR_RESPONSE;
    }
  }
};
