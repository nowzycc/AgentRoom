"""Start exactly one loopback worker; no reload, no access-log credential exposure."""
import uvicorn
from config import Config
from server import create_app

if __name__ == '__main__':
    config = Config.load()
    port = int(config.origin.rsplit(':', 1)[1])
    uvicorn.run(create_app(), host='127.0.0.1', port=port, workers=1, ws_max_size=65536, access_log=False, log_level='warning')
