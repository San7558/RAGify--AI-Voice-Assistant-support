import time
from fastapi import HTTPException

# Separate in-memory rate limit trackers for different routes
upload_rate_limits = {}
website_rate_limits = {}
chat_rate_limits = {}

def check_rate_limit(
    user_id: str, 
    rate_limits_dict: dict, 
    max_requests: int = 10, 
    window_seconds: int = 60
):
    """
    In-memory rate limiter based on user_id.
    Raises a 429 HTTPException if the user has exceeded max_requests within the window.
    """
    current_time = time.time()
    if user_id not in rate_limits_dict:
        rate_limits_dict[user_id] = []
        
    # Filter out requests older than the rolling window
    rate_limits_dict[user_id] = [
        t for t in rate_limits_dict[user_id] 
        if current_time - t < window_seconds
    ]
    
    if len(rate_limits_dict[user_id]) >= max_requests:
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later."
        )
        
    rate_limits_dict[user_id].append(current_time)
