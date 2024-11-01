curl -X POST https://localhost:3000/setupSession \
     -H "Content-Type: application/json" \
     -d '{"fromUser": "Bob", "toUser": "Alice"}'

curl -X POST https://localhost:3000/send \
     -H "Content-Type: application/json" \
     -d '{"fromUser": "Bob", "toUser": "Alice", "message": "Hi!"}'