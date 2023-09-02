import { useStorageContract, useExStorageContract } from './useContract'
import { useEffect, useState } from 'react'
import { getCurrentDomain } from "../helpers/getCurrentDomain"
import { getConnectedAddress } from "../helpers/setupWeb3"
import isProd from "../helpers/isProd"
import { CHAIN_INFO } from "../helpers/constants"

const storageAddressByChainId = {
  5: '0xafb8f27df1f629432a47214b4e1674cbcbdb02df',
  56: '0xa7472f384339D37EfE505a1A71619212495A973A',
}

const exStorageAddressByChainId = {
  5: '0xCFd685E34133b4bd0eB2Dd3CE501f37587ECb86c',
  56: '0x05b12174a320967698f1e432793d6f5b3b83bb7c'
}

const storageChainIdMainnet = 56
const storageChainIdTestnet = 5


const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'


export const getStorageInfo = () => {
  const _isProd = isProd()
  
  const storageChainId = _isProd ? storageChainIdMainnet : storageChainIdTestnet
  const storageChainInfo = CHAIN_INFO(storageChainId)
  const storageRpc = storageChainInfo.rpcUrls[0]
  const storageAddress = storageAddressByChainId[storageChainId]
  const exStorageAddress = exStorageAddressByChainId[storageChainId]

  return {
    storageChainId,
    storageAddress,
    exStorageAddress,
    storageRpc,
    storageChainInfo,
  }
}


const parseInfo = (info) => {
  const parsed = {
    chainId: '',
    mintType: 'DEMO',
    nftCollection: '',
    rewardToken: '',
    farmContract: '',
    texts: {},
    design: {},
    menu: false,
    exdata: {},
  }
  const result = JSON.parse(info)

  Object.keys(parsed).forEach((optKey) => {
    if (result[optKey]) parsed[optKey] = result[optKey]
  })
  return parsed
}

const parseExInfo = (info) => {
  const parsed = {}
  info.forEach((data) => {
    try {
      parsed[data.key] = JSON.parse(data.info)
    } catch (e) {
      console.warn(`>>> Not parseble exStorage data: key=${data.key} info=${data.info}`)
    }
  })
  return parsed
}

const processExData = (parsed) => {
  parsed.design = {}
  parsed.texts = {}
  Object.keys(parsed.exdata).forEach((exDataKey) => {
    if (exDataKey.substr(0, `design_`.length) == `design_`) {
      Object.keys(parsed.exdata[exDataKey]).forEach((k) => {
        parsed.design[k] = parsed.exdata[exDataKey][k]
      })
    }
    if (exDataKey.substr(0, `texts_`.length) == `texts_`) {
      Object.keys(parsed.exdata[exDataKey]).forEach((k) => {
        parsed.texts[k] = parsed.exdata[exDataKey][k]
      })
    }
  })
  return parsed
}

export default function useStorage() {
  const [storageData, setStorageData] = useState(null)
  const [storageIsLoading, setStorageIsLoading] = useState(true)
  const [storageTexts, setStorageTexts] = useState({})
  const [storageDesign, setStorageDesign] = useState({})
  const [storageMenu, setStorageMenu] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStakeInstalled, setIsStakeInstalled] = useState(false)
  const [error, setError] = useState(null)

  const storage = useStorageContract()
  const exStorage = useExStorageContract()
  
  const [ doReloadStorage, setDoReloadStorage ] = useState(true)

  useEffect(() => {
    if (doReloadStorage) {
      const fetchData = async () => {
        if (!storage) {
          console.log('>>> no storage')
          return
        }
        if (!exStorage) {
          console.log('>>> no exStorage')
          return
        }
        
        setError(null)
        setStorageIsLoading(true)
        
        let parsed: any
        let owner

        try {
          storageData = await storage.methods.getData(getCurrentDomain()).call()
          parsed = parseInfo(storageData.info || '{}')
        } catch (error) {
          console.log('>>> error', error)
          setError(error)
        }
        // ExStorage
        try {
          const exStorageData = await exStorage.methods.getScopeData(getCurrentDomain()).call()
          parsed = {
            ...parsed,
            exdata: parseExInfo(exStorageData || [])
          }
        } catch (error) {
          console.log('>>> error', error)
          setError(error)
        }
        if (parsed) {
          parsed = processExData(parsed)
          const { owner } = storageData

          const isBaseConfigReady = (
            parsed.chainId !== ''
            && parsed.nftCollection !== ''
            && parsed.rewardToken !== ''
            && parsed.farmContract !== ''
          )

          const isNFTConfigReady = (
            parsed.chainId != ''
            && parsed.nftCollection !== ''
          )
          setStorageData({
            ...parsed,
            owner: owner === ZERO_ADDRESS ? '' : owner,
            isBaseConfigReady,
            isNFTConfigReady,
            isInstalled: !(owner === ZERO_ADDRESS),
          })
          setIsInstalled(!(owner === ZERO_ADDRESS))
          setStorageTexts(parsed.texts)
          setStorageDesign(parsed.design)
          setStorageMenu(parsed.menu)
          const connectedWallet = await getConnectedAddress()
          if (connectedWallet && connectedWallet.toLowerCase() === owner.toLowerCase()) {
            setIsOwner(true)
          }
        }
        
        setStorageIsLoading(false)
      }
      fetchData()
      setDoReloadStorage(false)
    }
  }, [ doReloadStorage ])

  return {
    storageIsLoading,
    storageData,
    isOwner,
    isInstalled,
    error,
    storageTexts,
    storageMenu,
    storageDesign,
    setDoReloadStorage,
  }
}