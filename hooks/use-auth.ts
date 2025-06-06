"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const authSubscriptionRef = useRef<any>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    authSubscriptionRef.current = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Cleanup subscription on unmount
    return () => {
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.data.subscription.unsubscribe()
      }
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // Primeiro, tentar buscar o perfil existente
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId)

      if (error) {
        console.error("Error fetching profile:", error)
        throw error
      }

      if (data && data.length > 0) {
        // Se existir perfil, usar o primeiro (caso haja duplicatas)
        setProfile(data[0])
        console.log("Profile found:", data[0])
      } else {
        // Se não existir perfil, tentar criar um novo
        console.log("No profile found, attempting to create...")
        await createOrUpdateProfile(userId)
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error)
      // Se der erro ao buscar perfil, tentar criar/atualizar
      await createOrUpdateProfile(userId)
    } finally {
      setLoading(false)
    }
  }

  const createOrUpdateProfile = async (userId: string) => {
    try {
      // Obter informações do usuário autenticado
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        throw new Error("No authenticated user found")
      }

      // Extrair username do email ou usar um padrão
      const email = authUser.email || ""
      const username = authUser.user_metadata?.username || email.split("@")[0] || `user_${userId.slice(0, 8)}`

      const profileData = {
        id: userId,
        username: username,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        status: "online" as const,
      }

      // Usar UPSERT para inserir ou atualizar
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) {
        console.error("Error upserting profile:", error)

        // Se ainda der erro, tentar buscar o perfil novamente
        // (pode ter sido criado por outro processo)
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (fetchError) {
          throw new Error(`Failed to create or fetch profile: ${error.message}`)
        }

        console.log("Found existing profile after upsert error:", existingProfile)
        setProfile(existingProfile)
        return
      }

      console.log("Profile created/updated successfully:", data)
      setProfile(data)
    } catch (error) {
      console.error("Error in createOrUpdateProfile:", error)

      // Como último recurso, tentar buscar o perfil uma vez mais
      try {
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (!fallbackError && fallbackProfile) {
          console.log("Found profile on fallback fetch:", fallbackProfile)
          setProfile(fallbackProfile)
          return
        }
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError)
      }

      // Se tudo falhar, criar um perfil temporário para não quebrar a aplicação
      console.log("Creating temporary profile as last resort")
      setProfile({
        id: userId,
        username: `user_${userId.slice(0, 8)}`,
        avatar_url: null,
        status: "online",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    // Update status to offline before signing out
    if (profile) {
      try {
        await supabase.from("profiles").update({ status: "offline" }).eq("id", profile.id)
      } catch (error) {
        console.error("Error updating status on signout:", error)
      }
    }

    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateStatus = async (status: "online" | "away" | "offline") => {
    if (!profile) return

    try {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", profile.id)

      if (!error) {
        setProfile({ ...profile, status })
      }
      return { error }
    } catch (error) {
      console.error("Error updating status:", error)
      return { error }
    }
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateStatus,
  }
}
