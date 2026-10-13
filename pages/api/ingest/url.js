import handler from '../../../api/ingest/url';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb'
    }
  }
};

export default handler;
