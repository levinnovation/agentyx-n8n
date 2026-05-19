import json

path='/tmp/current_workflow.json'
with open(path) as f:
    data=json.load(f)

# Strip settings to safe fields
safe_settings = {k:v for k,v in data.get('settings',{}).items() if k in {'timezone','saveManualExecutions','executionOrder'}}
data['settings'] = safe_settings

with open(path,'w') as f:
    json.dump(data,f)
print('Settings stripped and saved')
