export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  release_id: string;
  release_name: string;
  cover_url: string;
  price_rub: number;
  quantity: number;
  created_at: string;
  track_id: string | null;
  track_name: string | null;
}
