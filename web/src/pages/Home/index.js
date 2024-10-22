import React, { useContext, useEffect, useState } from 'react';
import { Card, Col, Row } from '@douyinfe/semi-ui';
import { API, showError, showNotice, timestamp2string } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { marked } from 'marked';

const Home = () => {
  const [statusState] = useContext(StatusContext);
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');

  const displayNotice = async () => {
    const res = await API.get('/api/notice');
    const { success, message, data } = res.data;
    if (success) {
      let oldNotice = localStorage.getItem('notice');
      if (data !== oldNotice && data !== '') {
        const htmlNotice = marked(data);
        showNotice(htmlNotice, true);
        localStorage.setItem('notice', data);
      }
    } else {
      showError(message);
    }
  };

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);
    } else {
      showError(message);
      setHomePageContent('Failed to load homepage content...');
    }
    setHomePageContentLoaded(true);
  };

  const getStartTimeString = () => {
    const timestamp = statusState?.status?.start_time;
    return statusState.status ? timestamp2string(timestamp) : '';
  };

  useEffect(() => {
    displayNotice().then();
    displayHomePageContent().then();
  }, []);
  return (
    <>
      {homePageContentLoaded && homePageContent === '' ? (
        <>
          <Card
            bordered={false}
            headerLine={false}
            title='System Status'
            bodyStyle={{ padding: '10px 20px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title='System Information'
                  headerExtraContent={
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--semi-color-text-1)',
                      }}
                    >
                      System Information Overview
                    </span>
                  }
                >
                  <p>Name：{statusState?.status?.system_name}</p>
                  <p>
                    Version：
                    {statusState?.status?.version
                      ? statusState?.status?.version
                      : 'unknown'}
                  </p>
                  <p>
                    Source Code：
                    <a
                      href='#'
                      target='_blank'
                      rel='noreferrer'
                    >
                      #
                    </a>
                  </p>
                  <p>
                    协议：
                    <a
                      href='https://www.apache.org/licenses/LICENSE-2.0'
                      target='_blank'
                      rel='noreferrer'
                    >
                      Apache-2.0 License
                    </a>
                  </p>
                  <p>Startup Time：{getStartTimeString()}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title='System Configuration'
                  headerExtraContent={
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--semi-color-text-1)',
                      }}
                    >
                      System Configuration Overview
                    </span>
                  }
                >
                  <p>
                    Email Verification：
                    {statusState?.status?.email_verification === true
                      ? 'Enabled'
                      : 'Not Enabled'}
                  </p>
                  <p>
                    GitHub Authentication：
                    {statusState?.status?.github_oauth === true
                      ? 'Enabled'
                      : 'Not Enabled'}
                  </p>
                  <p>
                    WeChat Authentication：
                    {statusState?.status?.wechat_login === true
                      ? 'Enabled'
                      : 'Not Enabled'}
                  </p>
                  <p>
                    Turnstile User Verification：
                    {statusState?.status?.turnstile_check === true
                      ? 'Enabled'
                      : 'Not Enabled'}
                  </p>
                  <p>
                    Telegram Authentication：
                    {statusState?.status?.telegram_oauth === true
                      ? 'Enabled'
                      : 'Not Enabled'}
                  </p>
                </Card>
              </Col>
            </Row>
          </Card>
        </>
      ) : (
        <>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              style={{ width: '100%', height: '100vh', border: 'none' }}
            />
          ) : (
            <div
              style={{ fontSize: 'larger' }}
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            ></div>
          )}
        </>
      )}
    </>
  );
};

export default Home;
