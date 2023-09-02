import styles from "../../styles/Home.module.css"
import { useEffect, useState } from "react"
import { useStateUint } from "../../helpers/useState"
import {
  AVAILABLE_NETWORKS_INFO,
  CHAIN_INFO,
  CHAIN_EXPLORER_LINK
} from "../../helpers/constants"
import ImagesList from "./ImagesList" 
import toggleGroup from "../toggleGroup"
import fetchNftInfo from "../../helpers/fetchNftInfo"
import deployNft from "../../helpers/deployNft"
import { toWei, fromWei } from "../../helpers/wei"
import isImageUrl from "../../helpers/isImageUrl"
import callNftMethod from "../../helpers/callNftMethod"
import fetchTokensListInfo from "../../helpers/fetchTokensListInfo"
import SwitchNetworkAndCall from "../SwitchNetworkAndCall"
import FaIcon from "../FaIcon"
import MintNftForSale from "./MintNftForSale"
import List from "../List"

import crypto from "crypto"
import { BigNumber } from 'bignumber.js'
import NftInfoBlock from "./NftInfoBlock"


export default function TabNftCollection(options) {
  const {
    nftAddress,
    onNftDeployed,
    chainId,
    openConfirmWindow,
    addNotify,
    getActiveChain,
    saveStorageConfig,
  } = options

  const [isManagedNFT, setIsManagedNFT] = useState(false)
  const [nftCollection, setNftCollection] = useState(nftAddress)
  const [nftChainId, setNftChainId] = useState(chainId)
  const [nftSymbol, setNftSymbol] = useState(``)
  const [nftName, setNftName] = useState(``)
  const [nftMaxSupply, setNftMaxSupply] = useState(200)
  
  const [nftAllowTrade, setNftAllowTrade] = useState(0)
  const [nftAllowUserSale, setNftAllowUserSale] = useState(1)
  const [nftTradeFee, setNftTradeFee] = useStateUint(10)
  const [nftAllowedERC20, setNftAllowedERC20] = useState([])
  
  const [nftAllowMint, setNftAllowMint] = useState(1)
  const [nftMintPrice, setNftMintPrice] = useState(0.001)
  
  const [nftAllowMintOwn, setAllowMintOwn] = useState(0)
  const [nftMintOwnPrice, setNftMintOwnPrice] = useState(0.001)
  
  const [nftInfo, setNftInfo] = useState({})
  const [nftInfoFetched, setNftInfoFetched] = useState(false)
  const [nftInfoFetching, setNftInfoFetching] = useState(false)
  const [nftDeployOpened, setNftDeployOpened] = useState(false)
  const [nftIsDeployed, setNftIsDeployed] = useState(false)
  const [nftIsDeploying, setNftIsDeploying] = useState(false)

  const [nftBaseUri, setNftBaseUri] = useState("ipfs://")
  
  const openNftDeploy = () => {
    setNftDeployOpened(true)
  }
  const closeNftDeploy = () => {
    setNftDeployOpened(false)
  }

  const mintUrisListComponent = new ImagesList({
    openConfirmWindow,
    addNotify,
    emptyLabel: `There are no URI's for mint. Add it`,
  })

  const processNftInfo = (info) => {
    if (info && info.NFTStakeInfo) {
      const nftStakeInfo = info.NFTStakeInfo
      mintUrisListComponent.setItemsList([
        ...nftStakeInfo.mintUris
      ])
    }
  }

  const doSaveMintUris = () => {
    const urisForSave = mintUrisListComponent.getItemsList().filter((uri) => {
      return isImageUrl(uri)
    })
    console.log('>>> save list', urisForSave)
    const { activeWeb3 } = getActiveChain()
    callNftMethod({
      activeWeb3,
      contractAddress: nftCollection,
      method: 'setMintUris',
      args: [
        urisForSave
      ],
      onTrx: (txHash) => {
        console.log('>> onTrx', txHash)
      },
      onSuccess: (receipt) => {
        console.log('>> onSuccess', receipt)
      },
      onError: (err) => {
        console.log('>> onError', err)
      },
      onFinally: (answer) => {
        console.log('>> onFinally', answer)
      }
    })

  }

  const processFetchedManagedNFT = (info) => {
    mintUrisListComponent.setItemsList([ ...info.mintUris ])
  }

  const doFetchNftInfo = () => {
    setNftInfoFetched(false)
    setNftInfoFetching(true)
    setNftInfo({})
    addNotify(`Fetching NFT collection info`)
    fetchNftInfo(nftCollection, nftChainId).then((answ) => {
      console.log('>>> nft info', answ)
      addNotify(`NFT collection info fetched`, `success`)
      setNftInfo(answ)
      setIsManagedNFT(answ.isNFTStakeToken)
      setNftInfoFetched(true)
      setNftInfoFetching(false)
      if (answ.isNFTStakeToken && answ.NFTStakeInfo) {
        fetchTokensListInfo({
          erc20list: answ.NFTStakeInfo.allowedERC20,
          chainId: nftChainId
        })
        processNftInfo(answ)
      }
    }).catch((err) => {
      setNftInfoFetching(false)
      addNotify(`Fail fetch NFT collection info. ${err.message ? err.message : ''}`, `error`)
    })
  }

  

  useEffect(() => {
  }, [])

  const canDeployNft = (
    nftSymbol !== ``
    && nftName !== ``
    && nftMaxSupply > 0
    && (
      (nftAllowMint == 1 && nftMintPrice > 0) || (nftAllowMint == 0)
      ||
      (nftAllowMintOwn == 1 && nftMintOwnPrice > 0) || (nftAllowMintOwn == 0)
    )
  )
  
  const deployNewNft = () => {
    const {
      activeChainId,
      activeWeb3,
    } = getActiveChain()
    
    const activeChainInfo = CHAIN_INFO(activeChainId)

    /*
        string memory __symbol,
        string memory __name,
        string memory __baseUri,
        uint256 __maxSupply,
        uint256 __mintPrice,
        bool __allowTrade,
        bool __allowUserSale,
        uint __tradeFee,
        bool __allowMint,
        address[] memory __allowedERC20
    */
    const deployOptions = {
      activeWeb3,
      symbol: nftSymbol,
      name: nftName,
      baseURI: nftBaseUri,
      maxSupply: nftMaxSupply,
      allowTrade: (nftAllowTrade == 1),
      allowUserSale: (nftAllowUserSale == 1),
      tradeFee: nftTradeFee,
      allowedERC20: nftAllowedERC20,
      allowMint: (nftAllowMint == 1),
      mintPrice: toWei(`${nftMintPrice}`, 18), // @todo - 18 заменить на децимался нативной валюты
      allowMintOwn: (nftAllowMintOwn == 1),
      mintOwnPrice: toWei(`${nftMintOwnPrice}`, 18), // @todo - 18 заменить на децимался нативной валюты
      
    }
    
    openConfirmWindow({
      title: `Deploying NFT collection`,
      message: `Deploy NFT collection at ${activeChainInfo.chainName} (${activeChainId})?`,
      onConfirm: () => {
        setNftIsDeploying(true)
        setNftIsDeployed(false)
        addNotify(`Deploying NFT collection. Confirm transaction...`)
        deployNft({
          ...deployOptions,
          onTrx: (hash) => {
            addNotify(`NFT collection deploy TX ${hash}...`, `success`)
          },
          onSuccess: (newContractAddress) => {
            try {
              addNotify(`NFT collection deployed. Now save settings`, `success`)
              if (onNftDeployed) onNftDeployed(newContractAddress)
              setNftIsDeployed(true)
              setNftIsDeploying(false)
              setNftCollection(newContractAddress)
              setNftDeployOpened(false)
              openConfirmWindow({
                title: `Save NFT collection to config`,
                message: `Save deployed NFT collection ${newContractAddress} to config?`,
                onConfirm: () => {
                  saveStorageConfig({
                    newData: {
                      nftCollection: newContractAddress,
                    },
                    onBegin: () => {
                      addNotify(`Confirm transaction for save main config`)
                    },
                    onReady: () => {
                      addNotify(`NFTStake main config successfull saved`, `success`)
                    },
                    onError: (err) => {
                      addNotify(`Fail save main config`, `error`)
                    }
                  })
                }
              })
            } catch (err) {
              console.log('>>> onSuccess error', err)
            }
          },
          onError: (err) => {
            addNotify(`Fail deploy NFT collection. ${(err.message ? err.message : '')}`, `error`)
            setNftIsDeploying(false)
            console.log(err)
          }
        }).catch((err) => {
          setNftIsDeploying(false)
          addNotify(`Fail deploy NFT collection. ${err.message ? err.message : ''}`, `error`)
        })
      },
    })
  }

  const [ isEditMintUrisOpened, SetIsEditMintUrisOpened ] = useState(false)

  const nftChainInfo = CHAIN_INFO(nftChainId)
  const {
      activeChainId,
  } = getActiveChain()
  const activeChainInfo = CHAIN_INFO(activeChainId)

  const testClaim = () => {
    const { activeWeb3 } = getActiveChain()
    const seed = crypto.randomBytes(32).toString('hex')
    
    console.log('>> seed', seed)
    console.log('>>> nftInfo', nftInfo)
    
    if (nftInfo && nftInfo.NFTStakeInfo && nftInfo.NFTStakeInfo.mintPrice) {

      callNftMethod({
        activeWeb3,
        contractAddress: nftCollection,
        method: 'mintRandom',
        weiAmount: nftInfo.NFTStakeInfo.mintPrice,
        args: [
          `0x${seed}`
        ],
        onTrx: (txHash) => {
          console.log('>> onTrx', txHash)
        },
        onSuccess: (receipt) => {
          console.log('>> onSuccess', receipt)
        },
        onError: (err) => {
          console.log('>> onError', err)
        },
        onFinally: (answer) => {
          console.log('>> onFinally', answer)
        }
      })
    }
  }

  const NFTStakeInfo = nftInfo?.NFTStakeInfo || {}
  /* Change NFT base values */
  const [nftInfoAllowTrade, setNftInfoAllowTrade] = useState(
    (NFTStakeInfo?.allowTrade)
      ? (NFTStakeInfo.allowTrade ? 1 : 0)
      : 0
  )
  const [isNftInfoAllowTradeEdit, setIsNftInfoAllowTradeEdit] = useState(false)
  const [isNftInfoAllowTradeSaving, setIsNftInfoAllowTradeSaving] = useState(false)

  const beginEditNftInfoAllowTrade = () => {
    setNftInfoAllowTrade(
      (NFTStakeInfo?.allowTrade)
      ? (NFTStakeInfo.allowTrade ? 1 : 0)
      : 0
    )
    setIsNftInfoAllowTradeEdit(true)
  }
  
  const [nftInfoAllowMint, setNftInfoAllowMint] = useState(NFTStakeInfo.allowMint || false)
  const [isNftInfoAllowMintEdit, setIsNftInfoAllowMintEdit] = useState(false)
  const [isNftInfoAllowMintSaving, setIsNftAllowMintSaving] = useState(false)
  
  const [nftInfoMintPrice, setNftInfoMintPrice] = useState(fromWei(`${NFTStakeInfo.mintPrice || 0}`), nftChainInfo.decimals)
  const [isNftInfoMintPriceEdit, setIsNftInfoMintPriceEdit] = useState(false)
  const [isNftInfoMintPriceSaving, setIsNftInfoMintPriceSaving] = useState(false)



  const mintNftForSale = new MintNftForSale({
    nftAddress: nftCollection,
    nftInfo: nftInfo.NFTStakeInfo,
    chainId: nftChainId,
    openConfirmWindow,
    addNotify,
    getActiveChain,
  })

  return {
    setNftCollection,
    setNftChainId,
    render: () => {
      return (
        <>
          <div className={styles.adminForm}>
            {nftCollection && nftInfoFetched && !isManagedNFT && (
              <div className={styles.adminInfoError}>
                <span>This is not NFTStake managed collection. Mint and trade will be disabled.</span>
                <span>Specify NFTStake collection or deploy new</span>
              </div>
            )}
            <div className={styles.adminFormInputHolder}>
              {(nftCollection && nftChainId) ? (
                <>
                  <label>Collection chain: <b>{nftChainInfo.chainName} ({nftChainId})</b></label>
                  <label>Collection address:<b>{nftCollection}</b></label>
                </>
              ) : (
                <label><b>NFT collection address not configured</b></label>
              )}
              <div className={styles.actionsRow}>
                {(nftCollection && nftChainId) && (
                  <button disabled={nftInfoFetching || nftIsDeploying}  className={styles.adminButton} onClick={doFetchNftInfo}>
                    {nftInfoFetching ? `Fetching NFT info` : `Fetch NFT info`}
                  </button>
                )}
                <button disabled={nftInfoFetching || nftIsDeploying} className={styles.adminButton} onClick={openNftDeploy}>
                  Deploy NFT collection
                </button>
              </div>
            </div>
            {nftDeployOpened && (
              <div className={styles.subFormInfo}>
                <h3>Deploy new NFT collection</h3>
                <div className={styles.infoRow}>
                  <label>Chain ID:</label>
                  <span>
                    <b>{activeChainInfo.chainName} ({activeChainId})</b>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <label>Symbol:</label>
                  <div>
                    <input type="text" value={nftSymbol} onChange={(e) => { setNftSymbol(e.target.value) }} />
                    {nftSymbol == `` && (
                      <div>
                        <b className={styles.hasError}>Specify collection symbol</b>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.infoRow}>
                  <label>Name:</label>
                  <span>
                    <input type="text" value={nftName} onChange={(e) => { setNftName(e.target.value) }} />
                    {nftName == `` && (
                      <div>
                        <b className={styles.hasError}>Specify collection name</b>
                      </div>
                    )}
                  </span>
                  
                </div>
                <div className={styles.infoRow}>
                  <label>Base URI:</label>
                  <span>
                    <input type="text" value={nftBaseUri} onChange={(e) => { setNftBaseUri(e.target.value) }} />
                    <div>
                      <b>Specify baseURI for NFT. Json files must be in BaseUri/TokenId.json</b>
                    </div>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <label>Max supply:</label>
                  <span>
                    <input type="number" value={nftMaxSupply} onChange={(e) => { setNftMaxSupply(e.target.value) }} />
                    {!(nftMaxSupply > 0) && (
                      <div>
                        <b className={styles.hasError}>Max supply must be greater than zero</b>
                      </div>
                    )}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <label>Allow trade:</label>
                  <span>
                    <select value={nftAllowTrade} onChange={(e) => { setNftAllowTrade(e.target.value) }}>
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>
                  </span>
                </div>
                {nftAllowTrade == 1 && (
                  <div className={styles.infoRow}>
                    <label>Allow users to sell:</label>
                    <span>
                      <select value={nftAllowUserSale} onChange={(e) => { setNftAllowUserSale(e.target.value) }}>
                        <option value={1}>Yes</option>
                        <option value={0}>No</option>
                      </select>
                    </span>
                  </div>
                )}
                {nftAllowUserSale == 1 && nftAllowTrade == 1 && (
                  <div className={styles.infoRow}>
                    <label>User trade fee:</label>
                    <div>
                      <div>
                        <input type="number" min="0" max="30" value={nftTradeFee} onChange={(e) => { setNftTradeFee(e) }} />
                        <strong>%</strong>
                      </div>
                    </div>
                  </div>
                )}
                {nftAllowTrade == 1 && (
                  <div className={styles.infoRow}>
                    <label>Allowed ERC20 for trade:</label>
                    <div>
                      <div>
                        <strong className={styles.inputInfo}>List of token contracts that can be used for trading on par with native currency</strong>
                      </div>
                      <div>
                        <List items={nftAllowedERC20} onChange={(v) => { setNftAllowedERC20(v) }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <label>Allow mint:</label>
                  <span>
                    <select value={nftAllowMint} onChange={(e) => { setNftAllowMint(e.target.value) }}>
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>
                  </span>
                </div>
                {nftAllowMint == 1 && (
                  <div className={styles.infoRow}>
                    <label>Mint price ({CHAIN_INFO(nftChainId).nativeCurrency.symbol}):</label>
                    <span>
                      <input type="number" step="0.1" value={nftMintPrice} onChange={(e) => { setNftMintPrice(e.target.value) }} />
                      {!(nftMintPrice > 0) && (
                        <div>
                          <b className={styles.hasError}>Mint price must be greater than zero</b>
                        </div>
                      )}
                    </span>
                  </div>
                )}
                {/*
                <div className={styles.infoRow}>
                  <label>Allow user own mint:</label>
                  <div>
                    <div>
                      <select value={nftAllowMintOwn} onChange={(e) => { setAllowMintOwn(e.target.value) }}>
                        <option value={1}>Yes</option>
                        <option value={0}>No</option>
                      </select>
                    </div>
                  </div>
                </div>
                {nftAllowMintOwn == 1 && (
                  <div className={styles.infoRow}>
                    <label>Mint price ({CHAIN_INFO(nftChainId).nativeCurrency.symbol}):</label>
                    <div>
                      <div>
                        <input type="number" step="0.1" value={nftMintOwnPrice} onChange={(e) => { setNftMintOwnPrice(e.target.value) }} />
                        {!(nftMintOwnPrice > 0) && (
                          <div>
                            <b className={styles.hasError}>Mint price must be greater than zero</b>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                */}
                <div className={styles.actionsRow}>
                  <SwitchNetworkAndCall
                    chainId={nftChainId}
                    className={styles.adminButton}
                    disabled={!canDeployNft || nftIsDeploying}
                    onClick={deployNewNft}
                    action={`Deploy`}
                  >
                    Deploy
                  </SwitchNetworkAndCall>
                  <button disabled={nftIsDeploying} className={styles.adminButton} onClick={closeNftDeploy}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {nftInfo && nftInfo && nftInfo.NFTStakeInfo && !nftDeployOpened && (
            <NftInfoBlock
              NFTStakeInfo={nftInfo.NFTStakeInfo}
              chainId={nftChainId}
              getActiveChain={getActiveChain}
              contractAddress={nftCollection}
              openConfirmWindow={openConfirmWindow}
              addNotify={addNotify}
              onSaveChanges={doFetchNftInfo}
            />
          )}
          {nftInfo && nftInfo && nftInfo.NFTStakeInfo && !nftDeployOpened && (
            <div className={styles.adminForm}>
              {mintNftForSale.render()}
            </div>
          )}
          {/*<button onClick={testClaim} className="someOwnClass">Test claim</button>*/}
          {/*
          {nftInfoFetched && isManagedNFT && (
            <div className={styles.adminForm}>
              {toggleGroup({
                title: `Random Mint URIs list`,
                isOpened: isEditMintUrisOpened,
                onToggle: SetIsEditMintUrisOpened,
                content: mintUrisListComponent.render({
                  bottomButtons: () => {
                    return (
                      <button onClick={doSaveMintUris}>Save Mint Uris</button>
                    )
                  }
                })
              })}
            </div>
          )}
          */}
        </>
      )
    }
  }
}