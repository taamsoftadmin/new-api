import React, { useEffect, useState } from 'react';
import { Label } from 'semantic-ui-react';
import { API, copy, isAdmin, showError, showSuccess, timestamp2string } from '../helpers';

import {
    Table,
    Tag,
    Form,
    Button,
    Layout,
    Modal,
    Typography, Progress, Card
} from '@douyinfe/semi-ui';
import { ITEMS_PER_PAGE } from '../constants';

const colors = ['amber', 'blue', 'cyan', 'green', 'grey', 'indigo',
    'light-blue', 'lime', 'orange', 'pink',
    'purple', 'red', 'teal', 'violet', 'yellow'
]


const renderTimestamp = (timestampInSeconds) => {
    const date = new Date(timestampInSeconds * 1000); // 从s转换 for 毫s

    const year = date.getFullYear(); // 获取 y 份
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // 获取月份，从0开始需要+1，并保证两位数
    const day = ('0' + date.getDate()).slice(-2); // 获取日期，并保证两位数
    const hours = ('0' + date.getHours()).slice(-2); // 获取 h ，并保证两位数
    const minutes = ('0' + date.getMinutes()).slice(-2); // 获取 m ，并保证两位数
    const seconds = ('0' + date.getSeconds()).slice(-2); // 获取s钟，并保证两位数

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // 格式化输出
};

function renderDuration(submit_time, finishTime) {
    // 确保startTime和finishTime都是有效的Time戳
    if (!submit_time || !finishTime) return 'N/A';

    // 将Time戳转换 for Date对象
    const start = new Date(submit_time);
    const finish = new Date(finishTime);

    // 计算Time差（毫s）
    const durationMs = finish - start;

    // 将Time差转换 for s，并保留一位小数
    const durationSec = (durationMs / 1000).toFixed(1);

    // Settings颜色：大于60s则 for 红色，小于等于60s则 for 绿色
    const color = durationSec > 60 ? 'red' : 'green';

    // Back带有样式的颜色标签
    return (
        <Tag color={color} size="large">
            {durationSec} s
        </Tag>
    );
}

const LogsTable = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const isAdminUser = isAdmin();
    const columns = [
        {
            title: "Submission Time",
            dataIndex: 'submit_time',
            render: (text, record, index) => {
                return (
                    <div>
                        {text ? renderTimestamp(text) : "-"}
                    </div>
                );
            },
        },
        {
            title: "End Time",
            dataIndex: 'finish_time',
            render: (text, record, index) => {
                return (
                    <div>
                        {text ? renderTimestamp(text) : "-"}
                    </div>
                );
            },
        },
        {
            title: ' schedule ',
            dataIndex: 'progress',
            width: 50,
            render: (text, record, index) => {
                return (
                    <div>
                        {
                            // 转换For example100% for 数字100，如果text未定义，Back0
                            isNaN(text.replace('%', '')) ? text : <Progress width={42} type="circle" showInfo={true} percent={Number(text.replace('%', '') || 0)} aria-label="drawing progress" />
                        }
                    </div>
                );
            },
        },
        {
            title: 'Spent Time',
            dataIndex: 'finish_time', // 以finish_time作 for dataIndex
            key: 'finish_time',
            render: (finish, record) => {
                // 假设record.start_time是存在的，并且finish是完成Time的Time戳
                return <>
                    {
                        finish ? renderDuration(record.submit_time, finish) : "-"
                    }
                </>
            },
        },
        {
            title: "Channel",
            dataIndex: 'channel_id',
            className: isAdminUser ? 'tableShow' : 'tableHiddle',
            render: (text, record, index) => {
                return (
                    <div>
                        <Tag
                            color={colors[parseInt(text) % colors.length]}
                            size='large'
                            onClick={() => {
                                copyText(text); // 假设copyText是用于文本Copy的函数
                            }}
                        >
                            {' '}
                            {text}{' '}
                        </Tag>
                    </div>
                );
            },
        },
        {
            title: "Platform",
            dataIndex: 'platform',
            render: (text, record, index) => {
                return (
                    <div>
                        {renderPlatform(text)}
                    </div>
                );
            },
        },
        {
            title: 'Type',
            dataIndex: 'action',
            render: (text, record, index) => {
                return (
                    <div>
                        {renderType(text)}
                    </div>
                );
            },
        },
        {
            title: ' Task ID（click to viewDetails）',
            dataIndex: 'task_id',
            render: (text, record, index) => {
                return (<Typography.Text
                    ellipsis={{ showTooltip: true }}
                    //style={{width: 100}}
                    onClick={() => {
                        setModalContent(JSON.stringify(record, null, 2));
                        setIsModalOpen(true);
                    }}
                >
                    <div>
                        {text}
                    </div>
                </Typography.Text>);
            },
        },
        {
            title: ' Task Status',
            dataIndex: 'status',
            render: (text, record, index) => {
                return (
                    <div>
                        {renderStatus(text)}
                    </div>
                );
            },
        },

        {
            title: 'Failure reason ',
            dataIndex: 'fail_reason',
            render: (text, record, index) => {
                // 如果text未定义，Back替代文本，For example空字符串''或其他
                if (!text) {
                    return 'None';
                }

                return (
                    <Typography.Text
                        ellipsis={{ showTooltip: true }}
                        style={{ width: 100 }}
                        onClick={() => {
                            setModalContent(text);
                            setIsModalOpen(true);
                        }}
                    >
                        {text}
                    </Typography.Text>
                );
            }
        }
    ];

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState(1);
    const [logCount, setLogCount] = useState(ITEMS_PER_PAGE);
    const [logType] = useState(0);

    let now = new Date();
    // 初始化start_timestamp for 前One Day
    let zeroNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [inputs, setInputs] = useState({
        channel_id: '',
        task_id: '',
        start_timestamp: timestamp2string(zeroNow.getTime() /1000),
        end_timestamp: '',
    });
    const { channel_id, task_id, start_timestamp, end_timestamp } = inputs;

    const handleInputChange = (value, name) => {
        setInputs((inputs) => ({ ...inputs, [name]: value }));
    };


    const setLogsFormat = (logs) => {
        for (let i = 0; i < logs.length; i++) {
            logs[i].timestamp2string = timestamp2string(logs[i].created_at);
            logs[i].key = '' + logs[i].id;
        }
        // data.key = '' + data.id
        setLogs(logs);
        setLogCount(logs.length + ITEMS_PER_PAGE);
        // console.log(logCount);
    }

    const loadLogs = async (startIdx) => {
        setLoading(true);

        let url = '';
        let localStartTimestamp = parseInt(Date.parse(start_timestamp) / 1000);
        let localEndTimestamp = parseInt(Date.parse(end_timestamp) / 1000 );
        if (isAdminUser) {
            url = `/api/task/?p=${startIdx}&channel_id=${channel_id}&task_id=${task_id}&start_timestamp=${localStartTimestamp}&end_timestamp=${localEndTimestamp}`;
        } else {
            url = `/api/task/self?p=${startIdx}&task_id=${task_id}&start_timestamp=${localStartTimestamp}&end_timestamp=${localEndTimestamp}`;
        }
        const res = await API.get(url);
        let { success, message, data } = res.data;
        if (success) {
            if (startIdx === 0) {
                setLogsFormat(data);
            } else {
                let newLogs = [...logs];
                newLogs.splice(startIdx * ITEMS_PER_PAGE, data.length, ...data);
                setLogsFormat(newLogs);
            }
        } else {
            showError(message);
        }
        setLoading(false);
    };

    const pageData = logs.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

    const handlePageChange = page => {
        setActivePage(page);
        if (page === Math.ceil(logs.length / ITEMS_PER_PAGE) + 1) {
            // In this case we have to load more data and then append them.
            loadLogs(page - 1).then(r => {
            });
        }
    };

    const refresh = async () => {
        // setLoading(true);
        setActivePage(1);
        await loadLogs(0);
    };

    const copyText = async (text) => {
        if (await copy(text)) {
            showSuccess('Copied: ' + text);
        } else {
            // setSearchKeyword(text);
            Modal.error({ title: "Unable to copy to clipboard, please copy manually.", content: text });
        }
    }

    useEffect(() => {
        refresh().then();
    }, [logType]);

    const renderType = (type) => {
        switch (type) {
            case 'MUSIC':
                return <Label basic color='grey'> 生成音乐 </Label>;
            case 'LYRICS':
                return <Label basic color='pink'> 生成歌词 </Label>;

            default:
                return <Label basic color='black'> Unknown </Label>;
        }
    }

    const renderPlatform = (type) => {
        switch (type) {
            case "suno":
                return <Label basic color='green'> Suno </Label>;
            default:
                return <Label basic color='black'> Unknown </Label>;
        }
    }

    const renderStatus = (type) => {
        switch (type) {
            case 'SUCCESS':
                return <Label basic color='green'> Success </Label>;
            case 'NOT_START':
                return <Label basic color='black'> Not Started </Label>;
            case 'SUBMITTED':
                return <Label basic color='yellow'> In Queue </Label>;
            case 'IN_PROGRESS':
                return <Label basic color='blue'> In Progress </Label>;
            case 'FAILURE':
                return <Label basic color='red'> Failure </Label>;
            case 'QUEUED':
                return <Label basic color='red'> In Queue </Label>;
            case 'UNKNOWN':
                return <Label basic color='red'> Unknown </Label>;
            case '':
                return <Label basic color='black'> 正在Submit </Label>;
            default:
                return <Label basic color='black'> Unknown </Label>;
        }
    }

    return (
        <>

            <Layout>
                <Form layout='horizontal' labelPosition='inset'>
                    <>
                        {isAdminUser && <Form.Input field="channel_id" label='Channel ID' style={{ width: '236px', marginBottom: '10px' }} value={channel_id}
                                                    placeholder={'Optional Values'} name='channel_id'
                                                    onChange={value => handleInputChange(value, 'channel_id')} />
                        }
                        <Form.Input field="task_id" label={"Task ID"} style={{ width: '236px', marginBottom: '10px' }} value={task_id}
                            placeholder={"Optional Values"}
                            name='task_id'
                            onChange={value => handleInputChange(value, 'task_id')} />

                        <Form.DatePicker field="start_timestamp" label={"Start Time"} style={{ width: '236px', marginBottom: '10px' }}
                            initValue={start_timestamp}
                            value={start_timestamp} type='dateTime'
                            name='start_timestamp'
                            onChange={value => handleInputChange(value, 'start_timestamp')} />
                        <Form.DatePicker field="end_timestamp" fluid label={"End Time"} style={{ width: '236px', marginBottom: '10px' }}
                            initValue={end_timestamp}
                            value={end_timestamp} type='dateTime'
                            name='end_timestamp'
                            onChange={value => handleInputChange(value, 'end_timestamp')} />
                        <Button label={"Query"} type="primary" htmlType="submit" className="btn-margin-right"
                            onClick={refresh}>Query</Button>
                    </>
                </Form>
                <Card>
                    <Table columns={columns} dataSource={pageData} pagination={{
                        currentPage: activePage,
                        pageSize: ITEMS_PER_PAGE,
                        total: logCount,
                        pageSizeOpts: [10, 20, 50, 100],
                        onPageChange: handlePageChange,
                    }} loading={loading} />
                </Card>
                <Modal
                    visible={isModalOpen}
                    onOk={() => setIsModalOpen(false)}
                    onCancel={() => setIsModalOpen(false)}
                    closable={null}
                    bodyStyle={{ height: '400px', overflow: 'auto' }} // Settings模态框内容区域样式
                    width={800} // Settings模态框宽度
                >
                    <p style={{ whiteSpace: 'pre-line' }}>{modalContent}</p>
                </Modal>
            </Layout>
        </>
    );
};

export default LogsTable;
