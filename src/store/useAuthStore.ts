import { create } from 'zustand';
import { supabase } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'client' | 'seller';
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  initialize: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user });
        // Fetch profile
        let { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!profile || fetchError) {
          // Lazy initialize profile if it doesn't exist (e.g. no DB trigger)
          const role = session.user.user_metadata?.role || 'client';
          const full_name = session.user.user_metadata?.full_name || '';
          
          const { data: newProfile, error: profileInsertError } = await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email,
            full_name,
            role,
          }).select().single();
          
          if (profileInsertError) {
            console.error("Failed to insert profile (RLS issue?):", profileInsertError);
            // Fallback to local state so the UI doesn't break
            profile = { id: session.user.id, email: session.user.email, full_name, role, avatar_url: null };
          } else {
            profile = newProfile;
          }
          
          if (role === 'seller') {
            const { data: store } = await supabase.from('stores').select('id').eq('seller_id', session.user.id).single();
            if (!store) {
              const { error: storeInsertError } = await supabase.from('stores').insert({
                seller_id: session.user.id,
                shop_name: `${full_name || 'My'} Store`,
              });
              if (storeInsertError) {
                console.error("Failed to insert store (RLS issue?):", storeInsertError);
              }
            }
          }
        }
          
        if (profile) {
          set({ profile });
        }
      }
    } catch (error) {
      console.error('Error initializing auth', error);
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  }
}));
