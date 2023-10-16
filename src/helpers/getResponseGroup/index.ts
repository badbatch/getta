import * as consts from '../../constants.ts';

export const getResponseGroup = (status: number) => {
  switch (true) {
    case status < 200: {
      return consts.INFORMATION_REPSONSE;
    }

    case status < 300: {
      return consts.SUCCESSFUL_REPSONSE;
    }

    case status < 400: {
      return consts.REDIRECTION_REPSONSE;
    }

    case status < 500: {
      return consts.CLIENT_ERROR_REPSONSE;
    }

    default: {
      return consts.SERVER_ERROR_REPSONSE;
    }
  }
};
