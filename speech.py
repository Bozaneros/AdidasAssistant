import sys
from havenondemand.hodclient import *


# params = {'file': 'path/to/file.mp3'} # uncomment if using a local file


def getJobAsyncJobStatus(jobID):
   response = client.get_job_status(jobID)
   if response == None: # still transcribing...
       getJobAsyncJobStatus(jobID)
   elif response['status'] == "queued":
       getJobAsyncJobStatus(jobID)
   else: # done trasncribing
       transcription = response['actions'][0]['result']['document'][0]['content']
       print(transcription)

client = HODClient('a6ab233b-b303-457d-a8c1-9c83e98d319b', 'v1')
params = {'url': str(sys.argv[1])} # uncomment if using a publicly facing URL
response_async = client.post_request(params, HODApps.RECOGNIZE_SPEECH, async=True)
jobID = response_async['jobID']
print(getJobAsyncJobStatus(jobID))
