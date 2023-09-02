import styles from "../../styles/Home.module.css"
import { useEffect, useState } from "react"
import toggleGroup from "../toggleGroup"
import iconButton from "../iconButton"
import { CHAIN_INFO, ZERO_ADDRESS } from "../../helpers/constants"
import { useStateString, useStateCurrency } from "../../helpers/useState"
import callNftMethod from "../../helpers/callNftMethod"
import { toWei, fromWei } from "../../helpers/wei"
import fetchTokensListInfo from "../../helpers/fetchTokensListInfo"
import FormTabs from "../FormTabs"
import MintManyNftForSale from "./MintManyNftForSale"
import ImageInput from "../ImageInput"
import InputImage from "../InputImage"

import AdminNftMetadataGenerator from "../AdminNftMetadataGenerator"
import { createNftMetadata } from "../../helpers/createNftMetadata"
import SwitchNetworkAndCall from "../SwitchNetworkAndCall"

export default function MintNftForSale(options) {
  const {
    nftAddress,
    nftInfo,
    chainId,
    openConfirmWindow,
    addNotify,
    getActiveChain
  } = options

  const { allowedERC20 } = nftInfo || {}
  
  const [ isOpened, setIsOpened ] = useState(false)
  const onToggleOpen = () => {
    setIsOpened(!isOpened)
  }

  const [ tokenUri, setTokenUri, hasTokenUriError ] = useStateString(``, { notEmpty: true })
  const [ tokenPrice, setTokenPrice, hasTokenPriceError ] = useStateCurrency(0, { notZero: true } )
  const [ tokenCurrency, setTokenCurrency ] = useState(ZERO_ADDRESS)
  const [ isNftMinting, setIsNftMinting] = useState(false)
  const [ isAllowedERC20Fetched, setIsAllowedERC20Fetched ] = useState(false)
  const [ isAllowedERC20Fetching, setIsAllowedERC20Fetching ] = useState(false)
  const [ allowedERC20Info, setAllowedERC20Info ] = useState({}) 

  const [ nftMetadata, setNftMetadata ] = useState({})
  const [ nftMetadataUploading, setNftMetadataUploading ] = useState(false)
  const [ nftMetadataUploaded, setNftMetadataUploaded ] = useState(false)
  const [ nftMetadataValid, setNftMetadataValid ] = useState(false)
  
  useEffect(() => {
    if (nftInfo && nftInfo.allowedERC20 && !isAllowedERC20Fetching) {
      if (nftInfo.allowedERC20.length > 0) {
        fetchTokensListInfo({
          erc20list: nftInfo.allowedERC20,
          chainId,
        }).then((answ) => {
          setAllowedERC20Info(answ)
          console.log('>>> allowedERC20Info', answ)
          setIsAllowedERC20Fetching(false)
          setIsAllowedERC20Fetched(true)
        }).catch((err) => {
          console.log('Fail fetch allowed erc20 info', err)
          setIsAllowedERC20Fetched(true)
          setIsAllowedERC20Fetching(false)
        })
      } else {
        setIsAllowedERC20Fetched(true)
      }
    }
  }, [nftInfo])

  const { nativeCurrency } = CHAIN_INFO(chainId)

  const _doMintNtf = () => {
    openConfirmWindow({
      title: `Confirm action`,
      message: `Mint NFT for sale?`,
      onConfirm: () => {
        setIsNftMinting(true)
        addNotify(`Uploading Metadata to IPFS`)
        setNftMetadataUploading(true)
        createNftMetadata({
          ...nftMetadata
        }).then((mediaIpfsUrl) => {
          setNftMetadataUploading(false)
          setNftMetadataUploaded(true)
          console.log('>>> mediaIpfsUrl', mediaIpfsUrl)
          addNotify(`Mint NFT for sale. Confirm transaction`)
          const { activeWeb3 } = getActiveChain()
          callNftMethod({
            activeWeb3,
            contractAddress: nftAddress,
            method: `mintNFTForSell`,
            args: [
              [mediaIpfsUrl],
              [tokenCurrency],
              [toWei(
                tokenPrice,
                (tokenCurrency == ZERO_ADDRESS)
                  ? nativeCurrency.decimals
                  : allowedERC20Info[tokenCurrency].decimals
              )],
              ZERO_ADDRESS
            ],
            onTrx: (txHash) => {
              addNotify(`Mint NFT for sale TX ${txHash}`, `success`)
              console.log('>> onTrx', txHash)
            },
            onSuccess: (receipt) => {
              addNotify(`Broadcast Mint NFT TX`, `success`)
              console.log('>> onSuccess', receipt)
            },
            onError: (err) => {
              addNotify(`Fail mint NFT. ${err.message ? err.message : ''}`, `error`)
              setIsNftMinting(false)
              setNftMetadataUploaded(false)
              console.log('>> onError', err)
            },
            onFinally: (answer) => {
              const tokenId = answer?.events?.Mint?.returnValues?.tokenId
              addNotify(`NFT #${tokenId} is minted!`, `success`)
              setIsNftMinting(false)
              setNftMetadataUploaded(false)
              setMetadata({})
              console.log('>> onFinally', answer)
            }
          })
        }).catch((e) => {
          setNftMetadataUploading(false)
          addNotify(`Fail create NFT Metadata. ${e.message ? e.message : ''}`, `error`)
        })
      }
    })
  }
  const doMintNtf = () => {
    openConfirmWindow({
      title: `Confirm action`,
      message: `Mint NFT for sale?`,
      onConfirm: () => {
        setIsNftMinting(true)
        const { activeWeb3 } = getActiveChain()
        callNftMethod({
          activeWeb3,
          contractAddress: nftAddress,
          method: `mintNFTForSell`,
          args: [
            [""],
            [tokenCurrency],
            [toWei(
              tokenPrice,
              (tokenCurrency == ZERO_ADDRESS)
                ? nativeCurrency.decimals
                : allowedERC20Info[tokenCurrency].decimals
            )],
            ZERO_ADDRESS
          ],
          onTrx: (txHash) => {
            addNotify(`Mint NFT for sale TX ${txHash}`, `success`)
            console.log('>> onTrx', txHash)
          },
          onSuccess: (receipt) => {
            addNotify(`Broadcast Mint NFT TX`, `success`)
            console.log('>> onSuccess', receipt)
          },
          onError: (err) => {
            addNotify(`Fail mint NFT. ${err.message ? err.message : ''}`, `error`)
            setIsNftMinting(false)
            setNftMetadataUploaded(false)
            console.log('>> onError', err)
          },
          onFinally: (answer) => {
            const tokenId = answer?.events?.Mint?.returnValues?.tokenId
            addNotify(`NFT #${tokenId} is minted!`, `success`)
            setIsNftMinting(false)
            setNftMetadataUploaded(false)
            //setMetadata({})
            console.log('>> onFinally', answer)
          }
        })
      }
    })
  }

  
  const tabs = new FormTabs({
    activeTab: `mintone`,
    tabs: [
      {
        key: `mintone`,
        title: `Mint one NFT`,
        content: (
          <>
            {isAllowedERC20Fetched && (
              <>
                
              </>
            )}
            
            {isAllowedERC20Fetched ? (
              <div className={styles.subFormInfo}>
                {/*
                <AdminNftMetadataGenerator
                  metadata={nftMetadata}
                  setMetadata={setNftMetadata}
                  setIsValid={setNftMetadataValid}
                  isUploading={nftMetadataUploading}
                  isUploaded={nftMetadataUploaded}
                />
                */}
                <hr />
                {allowedERC20 && allowedERC20.length > 0 && (
                  <div className={styles.infoRow}>
                    <label>Sell currency:</label>
                    <div>
                      <div>
                        <select value={tokenCurrency} onChange={(e) => { setTokenCurrency(e.target.value) }}>
                          <option value={ZERO_ADDRESS}>Native currency ({nativeCurrency.symbol})</option>
                          {allowedERC20.map((erc20, key) => {
                            return (
                              <option key={key} value={erc20}>
                                {allowedERC20Info[erc20] ? (
                                  <>
                                    {`(${allowedERC20Info[erc20].symbol}) - `}
                                  </>
                                ) : ( <>``</> )}
                                {erc20}
                              </option>
                            )
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <label>Price:</label>
                  <span>
                    <div>
                      <input type="number" step="0.1" value={tokenPrice} onChange={(e) => { setTokenPrice(e) }} />
                      <strong>
                        {tokenCurrency == ZERO_ADDRESS ? (
                          <>
                            {nativeCurrency.symbol}
                          </>
                        ) : (
                          <>
                            {allowedERC20Info[tokenCurrency].symbol}
                          </>
                        )}
                      </strong>
                    </div>
                    {hasTokenPriceError && (
                      <div>
                        <b className={styles.hasError}>Price must be greater than zero</b>
                      </div>
                    )}
                  </span>
                </div>
                <div className={styles.actionsRow}>
                  <SwitchNetworkAndCall
                    chainId={chainId}
                    className={styles.adminSubButton}
                    disabled={/*!nftMetadataValid || */hasTokenPriceError}
                    onClick={doMintNtf}
                    action={`Mint NFT`} >
                    {isNftMinting ? `Minting NFT for sale...` : `Mint NFT for sale`}
                  </SwitchNetworkAndCall>
                </div>
              </div>
            ) : (
              <div>Fetching info about allowed ERC20 for sale...</div>
            )}
          </>
        )
      },{/*
      {
        key: `mintmore`,
        title: `Mint many NFT`,
        content: (
          <>
            {isAllowedERC20Fetched ? (
              <MintManyNftForSale
                chainId={chainId}
                getActiveChain={getActiveChain}
                nftAddress={nftAddress}
                openConfirmWindow={openConfirmWindow}
                addNotify={addNotify}
                allowedERC20Info={allowedERC20Info}
              />
            ) : (
              <div>Fetching info about allowed ERC20 for sale...</div>
            )}
          </>
        )
      }
      */}
    ]
  })
  return {
    render: () => {
      return toggleGroup({
        title: `Mint NFT for sale`,
        isOpened,
        onToggle: onToggleOpen,
        content: tabs.render()
      })
    }
  }
}