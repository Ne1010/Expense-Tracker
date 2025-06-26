import asyncio
import threading

def run_async(func, *args, **kwargs):
    loop = asyncio.new_event_loop()
    result = {}

    def runner():
        asyncio.set_event_loop(loop)
        result['value'] = loop.run_until_complete(func(*args, **kwargs))

    t = threading.Thread(target=runner)
    t.start()
    t.join()
    return result['value'] 