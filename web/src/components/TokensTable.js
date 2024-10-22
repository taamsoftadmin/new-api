import React, { useEffect, useState } from 'react';
import {
  API,
  copy,
  showError,
  showSuccess,
  timestamp2string,
} from '../helpers';

import { ITEMS_PER_PAGE } from '../constants';
import {renderGroup, renderQuota} from '../helpers/render';
import {
  Button,
  Dropdown,
  Form,
  Modal,
  Popconfirm,
  Popover, Space,
  SplitButtonGroup,
  Table,
  Tag,
} from '@douyinfe/semi-ui';

import { IconTreeTriangleDown } from '@douyinfe/semi-icons';
import EditToken from '../pages/Token/EditToken';

function renderTimestamp(timestamp) {
  return <>{timestamp2string(timestamp)}</>;
}

function renderStatus(status, model_limits_enabled = false) {
  switch (status) {
    case 1:
      if (model_limits_enabled) {
        return (
          <Tag color='green' size='large'>
            Enabled：限制Model
          </Tag>
        );
      } else {
        return (
          <Tag color='green' size='large'>
            Enabled
          </Tag>
        );
      }
    case 2:
      return (
        <Tag color='red' size='large'>
          {' '}
          Disabled{' '}
        </Tag>
      );
    case 3:
      return (
        <Tag color='yellow' size='large'>
          {' '}
          Expired{' '}
        </Tag>
      );
    case 4:
      return (
        <Tag color='grey' size='large'>
          {' '}
          Exhausted{' '}
        </Tag>
      );
    default:
      return (
        <Tag color='black' size='large'>
          {' '}
          Unknown status{' '}
        </Tag>
      );
  }
}

const TokensTable = () => {

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text, record, index) => {
        return <div>
          <Space>
            {renderStatus(text, record.model_limits_enabled)}
            {renderGroup(record.group)}
          </Space>
        </div>;
      },
    },
    {
      title: 'Quota used',
      dataIndex: 'used_quota',
      render: (text, record, index) => {
        return <div>{renderQuota(parseInt(text))}</div>;
      },
    },
    {
      title: 'Remaining quota',
      dataIndex: 'remain_quota',
      render: (text, record, index) => {
        return (
          <div>
            {record.unlimited_quota ? (
              <Tag size={'large'} color={'white'}>
                Unlimited
              </Tag>
            ) : (
              <Tag size={'large'} color={'light-blue'}>
                {renderQuota(parseInt(text))}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Creation Time',
      dataIndex: 'created_time',
      render: (text, record, index) => {
        return <div>{renderTimestamp(text)}</div>;
      },
    },
    {
      title: 'Expiration time',
      dataIndex: 'expired_time',
      render: (text, record, index) => {
        return (
          <div>
            {record.expired_time === -1 ? 'Never expires' : renderTimestamp(text)}
          </div>
        );
      },
    },
    {
      title: '',
      dataIndex: 'operate',
      render: (text, record, index) => {
        let chats = localStorage.getItem('chats');
        let chatsArray = []
        let chatLink = localStorage.getItem('chat_link');
        let mjLink = localStorage.getItem('chat_link2');
        let shouldUseCustom = true;
        if (chatLink) {
          shouldUseCustom = false;
          chatLink += `/#/?settings={"key":"{key}","url":"{address}"}`;
          chatsArray.push({
            node: 'item',
            key: 'default',
            name: 'ChatGPT Next Web',
            onClick: () => {
              onOpenLink('default', chatLink, record);
            },
          });
        }
        if (mjLink) {
          shouldUseCustom = false;
          mjLink += `/#/?settings={"key":"{key}","url":"{address}"}`;
          chatsArray.push({
            node: 'item',
            key: 'mj',
            name: 'ChatGPT Next Midjourney',
            onClick: () => {
              onOpenLink('mj', mjLink, record);
            },
          });
        }
        if (shouldUseCustom) {
          try {
            // console.log(chats);
            chats = JSON.parse(chats);
            // check chats is array
            if (Array.isArray(chats)) {
              for (let i = 0; i < chats.length; i++) {
                let chat = {}
                chat.node = 'item';
                // c is a map
                // chat.key = chats[i].name;
                // console.log(chats[i])
                for (let key in chats[i]) {
                  if (chats[i].hasOwnProperty(key)) {
                    chat.key = i;
                    chat.name = key;
                    chat.onClick = () => {
                      onOpenLink(key, chats[i][key], record);
                    }
                  }
                }
                chatsArray.push(chat);
              }
            }

          } catch (e) {
            console.log(e);
            showError('Chat链接 Configuration 错误，Please contact the administrator');
          }
        }
        return (
          <div>
            <Popover
              content={'sk-' + record.key}
              style={{ padding: 20 }}
              position='top'
            >
              <Button theme='light' type='tertiary' style={{ marginRight: 1 }}>
                View
              </Button>
            </Popover>
            <Button
              theme='light'
              type='secondary'
              style={{ marginRight: 1 }}
              onClick={async (text) => {
                await copyText('sk-' + record.key);
              }}
            >
              Copy
            </Button>
            <SplitButtonGroup
              style={{ marginRight: 1 }}
              aria-label='项目Operation按钮组'
            >
              <Button
                theme='light'
                style={{ color: 'rgba(var(--semi-teal-7), 1)' }}
                onClick={() => {
                  if (chatsArray.length === 0) {
                    showError('Please contact the administrator Configuration Chat链接');
                  } else {
                    onOpenLink('default', chats[0][Object.keys(chats[0])[0]], record);
                  }
                }}
              >
                Chat
              </Button>
              <Dropdown
                trigger='click'
                position='bottomRight'
                menu={chatsArray}
              >
                <Button
                  style={{
                    padding: '8px 4px',
                    color: 'rgba(var(--semi-teal-7), 1)',
                  }}
                  type='primary'
                  icon={<IconTreeTriangleDown />}
                ></Button>
              </Dropdown>
            </SplitButtonGroup>
            <Popconfirm
              title='Are you sure you want to delete this token?'
              content='This modification cannot be undone.'
              okType={'danger'}
              position={'left'}
              onConfirm={() => {
                manageToken(record.id, 'delete', record).then(() => {
                  removeRecord(record.key);
                });
              }}
            >
              <Button theme='light' type='danger' style={{ marginRight: 1 }}>
                Delete
              </Button>
            </Popconfirm>
            {record.status === 1 ? (
              <Button
                theme='light'
                type='warning'
                style={{ marginRight: 1 }}
                onClick={async () => {
                  manageToken(record.id, 'disable', record);
                }}
              >
                Disable
              </Button>
            ) : (
              <Button
                theme='light'
                type='secondary'
                style={{ marginRight: 1 }}
                onClick={async () => {
                  manageToken(record.id, 'enable', record);
                }}
              >
                Enable
              </Button>
            )}
            <Button
              theme='light'
              type='tertiary'
              style={{ marginRight: 1 }}
              onClick={() => {
                setEditingToken(record);
                setShowEdit(true);
              }}
            >
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [showEdit, setShowEdit] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [tokenCount, setTokenCount] = useState(pageSize);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchToken, setSearchToken] = useState('');
  const [searching, setSearching] = useState(false);
  const [chats, setChats] = useState([]);
  const [editingToken, setEditingToken] = useState({
    id: undefined,
  });

  const closeEdit = () => {
    setShowEdit(false);
    setTimeout(() => {
      setEditingToken({
        id: undefined,
      });
    }, 500);
  };

  const setTokensFormat = (tokens) => {
    setTokens(tokens);
    if (tokens.length >= pageSize) {
      setTokenCount(tokens.length + pageSize);
    } else {
      setTokenCount(tokens.length);
    }
  };

  let pageData = tokens.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const loadTokens = async (startIdx) => {
    setLoading(true);
    const res = await API.get(`/api/token/?p=${startIdx}&size=${pageSize}`);
    const { success, message, data } = res.data;
    if (success) {
      if (startIdx === 0) {
        setTokensFormat(data);
      } else {
        let newTokens = [...tokens];
        newTokens.splice(startIdx * pageSize, data.length, ...data);
        setTokensFormat(newTokens);
      }
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const refresh = async () => {
    await loadTokens(activePage - 1);
  };

  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess('Copied to clipboard!');
    } else {
      Modal.error({
        title: 'Unable to copy to clipboard, please copy manually.',
        content: text,
        size: 'large',
      });
    }
  };

  const onOpenLink = async (type, url, record) => {
    // console.log(type, url, key);
    let status = localStorage.getItem('status');
    let serverAddress = '';
    if (status) {
      status = JSON.parse(status);
      serverAddress = status.server_address;
    }
    if (serverAddress === '') {
      serverAddress = window.location.origin;
    }
    let encodedServerAddress = encodeURIComponent(serverAddress);
    url = url.replace('{address}', encodedServerAddress);
    url = url.replace('{key}', 'sk-' + record.key);
    // console.log(url);
    // const chatLink = localStorage.getItem('chat_link');
    // const mjLink = localStorage.getItem('chat_link2');
    // let defaultUrl;
    //
    // if (chatLink) {
    //   defaultUrl =
    //     chatLink + `/#/?settings={"key":"sk-${key}","url":"${serverAddress}"}`;
    // }
    // let url;
    // switch (type) {
    //   case 'ama':
    //     url = `ama://set-api-key?server=${encodedServerAddress}&key=sk-${key}`;
    //     break;
    //   case 'opencat':
    //     url = `opencat://team/join?domain=${encodedServerAddress}&token=sk-${key}`;
    //     break;
    //   case 'lobe':
    //     url = `https://chat-preview.lobehub.com/?settings={"keyVaults":{"openai":{"apiKey":"sk-${key}","baseURL":"${encodedServerAddress}/v1"}}}`;
    //     break;
    //   case 'next-mj':
    //     url =
    //       mjLink + `/#/?settings={"key":"sk-${key}","url":"${serverAddress}"}`;
    //     break;
    //   default:
    //     if (!chatLink) {
    //       showError('Admin未SettingsChat链接');
    //       return;
    //     }
    //     url = defaultUrl;
    // }

    window.open(url, '_blank');
  };

  useEffect(() => {
    loadTokens(0)
      .then()
      .catch((reason) => {
        showError(reason);
      });
  }, [pageSize]);

  const removeRecord = (key) => {
    let newDataSource = [...tokens];
    if (key != null) {
      let idx = newDataSource.findIndex((data) => data.key === key);

      if (idx > -1) {
        newDataSource.splice(idx, 1);
        setTokensFormat(newDataSource);
      }
    }
  };

  const manageToken = async (id, action, record) => {
    setLoading(true);
    let data = { id };
    let res;
    switch (action) {
      case 'delete':
        res = await API.delete(`/api/token/${id}/`);
        break;
      case 'enable':
        data.status = 1;
        res = await API.put('/api/token/?status_only=true', data);
        break;
      case 'disable':
        data.status = 2;
        res = await API.put('/api/token/?status_only=true', data);
        break;
    }
    const { success, message } = res.data;
    if (success) {
      showSuccess('Operation completed successfully!');
      let token = res.data.data;
      let newTokens = [...tokens];
      // let realIdx = (activePage - 1) * ITEMS_PER_PAGE + idx;
      if (action === 'delete') {
      } else {
        record.status = token.status;
        // newTokens[realIdx].status = token.status;
      }
      setTokensFormat(newTokens);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const searchTokens = async () => {
    if (searchKeyword === '' && searchToken === '') {
      // if keyword is blank, load files instead.
      await loadTokens(0);
      setActivePage(1);
      return;
    }
    setSearching(true);
    const res = await API.get(
      `/api/token/search?keyword=${searchKeyword}&token=${searchToken}`,
    );
    const { success, message, data } = res.data;
    if (success) {
      setTokensFormat(data);
      setActivePage(1);
    } else {
      showError(message);
    }
    setSearching(false);
  };

  const handleKeywordChange = async (value) => {
    setSearchKeyword(value.trim());
  };

  const handleSearchTokenChange = async (value) => {
    setSearchToken(value.trim());
  };

  const sortToken = (key) => {
    if (tokens.length === 0) return;
    setLoading(true);
    let sortedTokens = [...tokens];
    sortedTokens.sort((a, b) => {
      return ('' + a[key]).localeCompare(b[key]);
    });
    if (sortedTokens[0].id === tokens[0].id) {
      sortedTokens.reverse();
    }
    setTokens(sortedTokens);
    setLoading(false);
  };

  const handlePageChange = (page) => {
    setActivePage(page);
    if (page === Math.ceil(tokens.length / pageSize) + 1) {
      // In this case we have to load more data and then append them.
      loadTokens(page - 1).then((r) => {});
    }
  };

  const rowSelection = {
    onSelect: (record, selected) => {},
    onSelectAll: (selected, selectedRows) => {},
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedKeys(selectedRows);
    },
  };

  const handleRow = (record, index) => {
    if (record.status !== 1) {
      return {
        style: {
          background: 'var(--semi-color-disabled-border)',
        },
      };
    } else {
      return {};
    }
  };

  return (
    <>
      <EditToken
        refresh={refresh}
        editingToken={editingToken}
        visiable={showEdit}
        handleClose={closeEdit}
      ></EditToken>
      <Form
        layout='horizontal'
        style={{ marginTop: 10 }}
        labelPosition={'left'}
      >
        <Form.Input
          field='keyword'
          label='Search Keyword'
          placeholder='Token Name'
          value={searchKeyword}
          loading={searching}
          onChange={handleKeywordChange}
        />
        <Form.Input
          field='token'
          label='Key'
          placeholder='Key'
          value={searchToken}
          loading={searching}
          onChange={handleSearchTokenChange}
        />
        <Button
          label='Query'
          type='primary'
          htmlType='submit'
          className='btn-margin-right'
          onClick={searchTokens}
          style={{ marginRight: 8 }}
        >
          Query
        </Button>
      </Form>

      <Table
        style={{ marginTop: 20 }}
        columns={columns}
        dataSource={pageData}
        pagination={{
          currentPage: activePage,
          pageSize: pageSize,
          total: tokenCount,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          formatPageText: (page) =>
            ` No.  ${page.currentStart} - ${page.currentEnd}  item, total  ${tokens.length}  item `,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setActivePage(1);
          },
          onPageChange: handlePageChange,
        }}
        loading={loading}
        rowSelection={rowSelection}
        onRow={handleRow}
      ></Table>
      <Button
        theme='light'
        type='primary'
        style={{ marginRight: 8 }}
        onClick={() => {
          setEditingToken({
            id: undefined,
          });
          setShowEdit(true);
        }}
      >
        Add Token
      </Button>
      <Button
        label='Copy selected Token'
        type='warning'
        onClick={async () => {
          if (selectedKeys.length === 0) {
            showError('Please select at least one token!');
            return;
          }
          let keys = '';
          for (let i = 0; i < selectedKeys.length; i++) {
            keys +=
              selectedKeys[i].name + '    sk-' + selectedKeys[i].key + '\n';
          }
          await copyText(keys);
        }}
      >
        Copy Selected Tokens to Clipboard
      </Button>
    </>
  );
};

export default TokensTable;
