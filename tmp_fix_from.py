import json

path='/Users/vinicioflores/agentyx-vertical-assets/tenants/levinnovation/assets/workflows/n8n/customer-service-core/customer-service-core.json'
with open(path) as f:
    data=f.read()

old='\\"from\\":\\"me\\"'
new='\\"from\\":\\"noreply@levinnovation.com\\"'

if old not in data:
    print('ERROR: pattern not found')
    exit(1)

count=data.count(old)
print(f'Replacing {count} occurrences of {old} with {new}')

data=data.replace(old,new)

with open(path,'w') as f:
    f.write(data)

print('Done')
