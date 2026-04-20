import urllib.request, json
req = urllib.request.Request('http://localhost:5000/api/accounts/create', data=json.dumps({'email': 'xy@ex.com', 'role': 'staff'}).encode('utf-8'), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer test'})
try:
    res = urllib.request.urlopen(req)
    print(res.read())
except Exception as e:
    print(e.read())
