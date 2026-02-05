/**
 * User Profile Service - STUB VERSION
 * 
 * Profile contract has been removed. These are stub functions that return
 * fallback data (truncated addresses) for components that still reference profiles.
 */

import { useState } from 'react'
import { truncateAddress } from '../utils/addressUtils'

// Profile types
export interface UserProfile {
  displayName: string
  avatarUrl: string
  walletAddress: string
  createdAt: number
  updatedAt: number
}

export interface BasicProfile {
  displayName: string
  avatarUrl: string
}

export interface ProfileWithExists {
  displayName: string
  avatarUrl: string
  exists: boolean
}

// Stub hooks - Profile contract was removed
export function useCreateProfile() {
  const [isPending] = useState(false)
  const [error] = useState<string | null>(null)

  const createProfile = async (_displayName: string, _avatarUrl: string = '') => {
    console.warn('Profile contract has been removed')
    return null
  }

  return { createProfile, isPending, error }
}

export function useUpdateProfile() {
  const [isPending] = useState(false)
  const [error] = useState<string | null>(null)

  const updateProfile = async (_displayName: string, _avatarUrl: string = '') => {
    console.warn('Profile contract has been removed')
    return null
  }

  const updateDisplayName = async (_displayName: string) => {
    console.warn('Profile contract has been removed')
    return null
  }

  const updateAvatarUrl = async (_avatarUrl: string) => {
    console.warn('Profile contract has been removed')
    return null
  }

  return { updateProfile, updateDisplayName, updateAvatarUrl, isPending, error }
}

// Returns truncated address as fallback
export function useGetProfile(userAddress: string | null) {
  const [data] = useState<UserProfile | null>(
    userAddress ? {
      displayName: truncateAddress(userAddress),
      avatarUrl: '',
      walletAddress: userAddress,
      createdAt: 0,
      updatedAt: 0,
    } : null
  )
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const refetch = async () => {
    console.warn('Profile contract has been removed')
  }

  return { data, isLoading, error, refetch }
}

export function useGetBasicProfile(userAddress: string | null) {
  const [data] = useState<BasicProfile | null>(
    userAddress ? {
      displayName: truncateAddress(userAddress),
      avatarUrl: '',
    } : null
  )
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const refetch = async () => {
    console.warn('Profile contract has been removed')
  }

  return { data, isLoading, error, refetch }
}

export function useGetMultipleProfiles() {
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const getMultipleDisplayNames = async (addresses: string[]): Promise<string[]> => {
    return addresses.map(addr => truncateAddress(addr))
  }

  const getMultipleAvatarUrls = async (addresses: string[]): Promise<string[]> => {
    return addresses.map(() => '')
  }

  const getMultipleBasicProfiles = async (addresses: string[]): Promise<BasicProfile[]> => {
    return addresses.map(addr => ({
      displayName: truncateAddress(addr),
      avatarUrl: '',
    }))
  }

  const checkMultipleProfilesExist = async (addresses: string[]): Promise<boolean[]> => {
    return addresses.map(() => false)
  }

  return {
    getMultipleDisplayNames,
    getMultipleAvatarUrls,
    getMultipleBasicProfiles,
    checkMultipleProfilesExist,
    isLoading,
    error,
  }
}

export function useProfileExists(_userAddress: string | null) {
  const [exists] = useState<boolean | null>(false)
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const refetch = async () => {
    console.warn('Profile contract has been removed')
  }

  return { exists, isLoading, error, refetch }
}

export function useValidateProfile(_userAddress: string | null) {
  const [isValid] = useState<boolean | null>(false)
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const refetch = async () => {
    console.warn('Profile contract has been removed')
  }

  return { isValid, isLoading, error, refetch }
}

// Utility functions
export const getDisplayNameOrAddress = (profile: BasicProfile | null, address: string): string => {
  return profile?.displayName && profile.displayName.trim()
    ? profile.displayName
    : truncateAddress(address)
}

export const getAvatarUrlOrDefault = (profile: BasicProfile | null, defaultAvatar: string = ''): string => {
  return profile?.avatarUrl && profile.avatarUrl.trim()
    ? profile.avatarUrl
    : defaultAvatar
}