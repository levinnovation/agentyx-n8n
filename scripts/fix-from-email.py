import json

path = 'tenants/levinnovation/assets/workflows/n8n/customer-service-core/customer-service-core.json'

with open(path, 'r') as f:
    data = f.read()

# Replace all occurrences of from:"me" in ACTION_DIRECTIVE strings
# The pattern is escaped as from\\":\\"me in the JSON
import re

# Match the pattern in JSON strings: \\"from\\":\\"me\\"
old_pattern = r'\\"from\\":\\"me\\"'
new_pattern = r'\\"from\\":\\"noreply@levinnovation.com\\"'

count = len(re.findall(old_pattern, data))
print(f"Found {count} occurrences of from:\"me\"")

data = re.sub(old_pattern, new_pattern, data)

with open(path, 'w') as f:
    f.write(data)

print(f"Replaced all occurrences with noreply@levinnovation.com")
