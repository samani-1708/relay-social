                                                            
  1. Callback URLs — currently pointing to localhost. Update in root .env:                               
  API_URL=https://yourdomain.com  (or http://VM_EXTERNAL_IP)
  GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback                                    
  TWITTER_CALLBACK_URL=https://yourdomain.com/api/accounts/oauth/twitter/callback
  YOUTUBE_CALLBACK_URL=https://yourdomain.com/api/accounts/oauth/youtube/callback                        
  APP_URL=https://yourdomain.com                            
  2. OAuth app redirect URIs — update in each platform's developer portal to match the new callback URLs 
  (LinkedIn, Twitter, Google, Meta, YouTube)                                                             
  3. STORAGE_PUBLIC_BASE_URL — set to your VM's external IP/domain so Instagram/TikTok can pull media:   
  STORAGE_PUBLIC_BASE_URL=https://yourdomain.com/relayman-media                                          
  4. Secrets — change JWT_SECRET from change-me-in-production to something strong
  5. Firewall rules — open ports 80 (nginx) and optionally 9001 (MinIO console, restrict to your IP)     
                                                                                                         
  The docker-compose already has the right profiles and structure for this. Just run the same command you
   used locally:                                                                                         
  docker compose --profile local-db --profile local-redis --profile local-storage up -d 