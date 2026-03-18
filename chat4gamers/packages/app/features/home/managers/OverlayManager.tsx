import {EditProfileSheet} from "app/features/home/sheets/EditUsernameSheet";
import {CreateChannelSheet} from "app/features/home/sheets/CreateChannelSheet";
import {SettingsSheet} from "app/features/home/sheets/SettingsSheet";
import {useCallback} from "react";
import { apiFetch } from "@my/api-client";
import {persist} from "zustand/middleware/persist";


export function OverlayManager({
                                 serverUrl,
                                 changeUsername,
                                 identity,
                                 showEditUsername,
                                 setShowEditUsername,
                                 usernameInput,
                                 setUsernameInput,
                                 showSettings,
                                 setShowSettings,
                                 showCreateChannel,
                                 setShowCreateChannel,
                                 createChannelType,
                                 newChannelName,
                                 setNewChannelName,
                                 appVersion,
  changePfp
                               }: any) {


  const handleCreateChannel = useCallback(async () => {
    const name = newChannelName.trim();
    if (!name || !serverUrl) return;
    try {
      await apiFetch(`${serverUrl}`, `/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({ name, type: createChannelType }),
      });
      setShowCreateChannel(false);
      setNewChannelName('');
    } catch (e) {
      console.error("Failed to create channel", e);
    }
  }, [newChannelName, createChannelType, serverUrl, setShowCreateChannel, setNewChannelName]);



  return (
    <>
      <EditProfileSheet
        showEditUsername={showEditUsername}
        setShowEditUsername={setShowEditUsername}
        usernameInput={usernameInput}
        setUsernameInput={setUsernameInput}
        changeUsername={changeUsername}
        currentPfp={identity?.pfp}
        changePfp={changePfp}
      />

      <CreateChannelSheet
        showCreateChannel={showCreateChannel}
        setShowCreateChannel={setShowCreateChannel}
        createChannelType={createChannelType}
        newChannelName={newChannelName}
        setNewChannelName={setNewChannelName}
        handleCreateChannel={handleCreateChannel}
      />

      <SettingsSheet
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        identity={identity}
        appVersion={appVersion}
      />
    </>
  )
}