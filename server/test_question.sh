curl -N http://localhost:5000/api/chat/sessions/569af42c-6688-44a9-a1d9-7c6a200c618f/chat \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRmMmQ4MzVjLTVlMGUtNDVmOC05YzcyLTk5MGNlN2U4YjYyOCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTc4MjEyNDQ5NywiZXhwIjoxNzgyNzI5Mjk3fQ.a5kusGOOFN9QqMnJ-ryM8GkYaLP1Q9qbzZq56n9blxw" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is RAG?","documentId":"ea9e42f7-4078-44d5-a2b1-62edc2ae7d8d"}' \
  -X POST
