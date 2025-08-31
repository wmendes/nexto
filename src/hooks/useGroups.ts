'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConsortiumGroup } from '@/types'
import { useWallet } from './useWallet'
import { useGroupManager } from './useContracts'

interface UseGroupsReturn {
  groups: ConsortiumGroup[]
  isLoading: boolean
  error: string | null
  joinGroup: (groupId: string, tokenURI: string) => Promise<void>
  createGroup: (groupData: Partial<ConsortiumGroup>) => Promise<ConsortiumGroup>
  refreshGroups: () => Promise<void>
  getUserGroups: () => Promise<ConsortiumGroup[]>
  getGroup: (groupId: string) => Promise<ConsortiumGroup | null>
}

export const useGroups = (): UseGroupsReturn => {
  const { address, isConnected } = useWallet()
  const groupManager = useGroupManager()
  const [groups, setGroups] = useState<ConsortiumGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert contract group data to our ConsortiumGroup type
  const contractGroupToConsortiumGroup = (contractGroup: any, groupId: string): ConsortiumGroup => {
    return {
      id: groupId,
      name: contractGroup.name,
      assetType: 'real_estate', // Default type for now
      totalValue: contractGroup.totalValue,
      quotas: contractGroup.quotas,
      quotaValue: contractGroup.quotaValue,
      duration: contractGroup.duration,
      adminFee: contractGroup.adminFee,
      reserveFund: contractGroup.reserveFund,
      startDate: contractGroup.startDate,
      assemblyFrequency: 'monthly', // Default for now
      participants: contractGroup.participants,
      maxParticipants: contractGroup.maxParticipants,
      status: contractGroup.isActive ? 'active' : 'completed',
      organizerAddress: contractGroup.organizer,
      ipfsHash: contractGroup.ipfsHash,
    }
  }

  // Load groups from smart contract
  const loadGroups = useCallback(async () => {
    if (!groupManager.isConnected || !groupManager.contract) {
      // No contract connection, set empty groups
      setGroups([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const groupIds = await groupManager.getAllGroups()
      const groupPromises = groupIds.map(async (groupId: string) => {
        try {
          const contractGroup = await groupManager.getGroup(groupId)
          return contractGroupToConsortiumGroup(contractGroup, groupId)
        } catch (err) {
          console.error(`Error loading group ${groupId}:`, err)
          return null
        }
      })

      const loadedGroups = await Promise.all(groupPromises)
      const validGroups = loadedGroups.filter((group): group is ConsortiumGroup => group !== null)
      
      setGroups(validGroups)
    } catch (err) {
      console.error('Error loading groups:', err)
      setError('Failed to load consortium groups from blockchain')
      setGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [groupManager.isConnected])

  // Join a group using smart contract
  const joinGroup = async (groupId: string, tokenURI: string = '') => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    if (!groupManager.isConnected || !groupManager.contract) {
      throw new Error('Smart contract not available')
    }

    setError(null)

    try {
      // Generate a simple token URI if not provided
      const defaultTokenURI = tokenURI || `https://consortium.app/metadata/${groupId}/${address}`
      
      const { tx, receipt } = await groupManager.joinGroup(groupId, defaultTokenURI)
      
      console.log('Join group transaction:', tx.hash)
      console.log('Transaction receipt:', receipt)

      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, participants: group.participants + 1 }
            : group
        )
      )

    } catch (err: any) {
      console.error('Error joining group:', err)
      let errorMessage = 'Failed to join group. Please try again.'
      
      if (err.message?.includes('KYC approval required')) {
        errorMessage = 'KYC verification required to join groups.'
      } else if (err.message?.includes('Group is full')) {
        errorMessage = 'This group is already full.'
      } else if (err.message?.includes('Already in group')) {
        errorMessage = 'You are already a member of this group.'
      }
      
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Create a new group using smart contract
  const createGroup = async (groupData: Partial<ConsortiumGroup>): Promise<ConsortiumGroup> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    if (!groupManager.isConnected || !groupManager.contract) {
      throw new Error('Smart contract not available')
    }

    setError(null)

    try {
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const contractGroupData = {
        groupId,
        name: groupData.name || 'Unnamed Group',
        totalValue: groupData.totalValue || 100000,
        quotas: groupData.quotas || 50,
        duration: groupData.duration || 12,
        adminFee: groupData.adminFee || 3,
        reserveFund: groupData.reserveFund || 2,
        ipfsHash: groupData.ipfsHash || `QmNew${Date.now()}...`,
      }

      const { tx, receipt } = await groupManager.createGroup(contractGroupData)
      
      console.log('Create group transaction:', tx.hash)
      console.log('Transaction receipt:', receipt)

      // Create the new group object
      const newGroup: ConsortiumGroup = {
        id: groupId,
        name: contractGroupData.name,
        assetType: groupData.assetType || 'real_estate',
        totalValue: contractGroupData.totalValue,
        quotas: contractGroupData.quotas,
        quotaValue: Math.round(contractGroupData.totalValue / contractGroupData.quotas),
        duration: contractGroupData.duration,
        adminFee: contractGroupData.adminFee,
        reserveFund: contractGroupData.reserveFund,
        startDate: new Date(),
        assemblyFrequency: groupData.assemblyFrequency || 'monthly',
        participants: 0,
        maxParticipants: contractGroupData.quotas,
        status: 'active',
        organizerAddress: address,
        ipfsHash: contractGroupData.ipfsHash,
      }

      // Add to local state
      setGroups(prevGroups => [...prevGroups, newGroup])

      return newGroup

    } catch (err: any) {
      console.error('Error creating group:', err)
      let errorMessage = 'Failed to create group. Please try again.'
      
      if (err.message?.includes('Group already exists')) {
        errorMessage = 'A group with this ID already exists.'
      }
      
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get a specific group
  const getGroup = async (groupId: string): Promise<ConsortiumGroup | null> => {
    if (!groupManager.isConnected || !groupManager.contract) {
      console.log('No contract connection available, checking local groups...')
      // Return from local state if no contract
      const localGroup = groups.find(group => group.id === groupId)
      console.log(`Local group search for ${groupId}:`, localGroup)
      return localGroup || null
    }

    try {
      console.log(`Fetching group ${groupId} from contract...`)
      const contractGroup = await groupManager.getGroup(groupId)
      
      if (!contractGroup) {
        console.log(`Contract returned null for group ${groupId}`)
        return null
      }
      
      console.log('Contract group data:', contractGroup)
      const result = contractGroupToConsortiumGroup(contractGroup, groupId)
      console.log('Converted group data:', result)
      return result
    } catch (err) {
      console.error('Error getting group from contract:', err)
      // Fallback to local state
      const localGroup = groups.find(group => group.id === groupId)
      console.log('Fallback to local group:', localGroup)
      return localGroup || null
    }
  }

  // Get groups that the current user has joined
  const getUserGroups = async (): Promise<ConsortiumGroup[]> => {
    if (!address || !groupManager.isConnected || !groupManager.contract) {
      return []
    }
    
    try {
      // Check membership for each group
      const membershipPromises = groups.map(async (group) => {
        try {
          const isMember = await groupManager.isMemberOfGroup(group.id, address)
          return isMember ? group : null
        } catch {
          return null
        }
      })

      const membershipResults = await Promise.all(membershipPromises)
      return membershipResults.filter((group): group is ConsortiumGroup => group !== null)
    } catch (err) {
      console.error('Error getting user groups:', err)
      return []
    }
  }

  // Refresh groups data
  const refreshGroups = async () => {
    await loadGroups()
  }

  // Load groups on mount and when wallet/contract connects
  useEffect(() => {
    const fetchGroups = async () => {
      if (!groupManager.isConnected || !groupManager.contract) {
        setGroups([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const groupIds = await groupManager.getAllGroups()
        const groupPromises = groupIds.map(async (groupId: string) => {
          try {
            const contractGroup = await groupManager.getGroup(groupId)
            return contractGroupToConsortiumGroup(contractGroup, groupId)
          } catch (err) {
            console.error(`Error loading group ${groupId}:`, err)
            return null
          }
        })

        const loadedGroups = await Promise.all(groupPromises)
        const validGroups = loadedGroups.filter((group): group is ConsortiumGroup => group !== null)
        
        setGroups(validGroups)
      } catch (err) {
        console.error('Error loading groups:', err)
        setError('Failed to load consortium groups from blockchain')
        setGroups([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [isConnected, groupManager.isConnected])

  return {
    groups,
    isLoading,
    error,
    joinGroup,
    createGroup,
    refreshGroups,
    getUserGroups,
    getGroup,
  }
}