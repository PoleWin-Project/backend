pipeline {
    agent any

    environment {
        IMAGE_NAME = 'polewin-backend'
        SONAR_HOST_URL = 'http://sonarqube:9000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh '''
                    npm ci || npm install
                    npm run build
                '''
            }
        }

        stage('Tests') {
            steps {
                sh '''
                    npm run test:coverage || true
                '''
            }
        }

        stage('SonarQube analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token-backend', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        docker run --rm \
                        --network polewin_default \
                        --volumes-from jenkins \
                        -w "$WORKSPACE" \
                        -e SONAR_TOKEN="$SONAR_TOKEN" \
                        sonarsource/sonar-scanner-cli:latest \
                        sonar-scanner \
                            -Dsonar.projectKey=polewin-backend \
                            -Dsonar.sources=src \
                            -Dsonar.inclusions=**/*.ts,**/*.js \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/.git/**,**/*.spec.ts,**/*.test.ts \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.typescript.tsconfigPath=tsconfig.json \
                            -Dsonar.scm.provider=git \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.token=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Trivy FS scan') {
            steps {
                sh '''
                    echo "=== Trivy FS scan (backend workspace) ==="
                    docker run --rm \
                    --network polewin_default \
                    --volumes-from jenkins \
                    -w "$WORKSPACE" \
                    aquasec/trivy:0.69.3 fs \
                        --scanners secret \
                        --skip-dirs .git,node_modules,dist \
                        --exit-code 0 \
                        --no-progress \
                        "$WORKSPACE"
                '''
            }
        }

        stage('Build Docker image') {
            steps {
                script {
                    env.IMAGE_TAG = env.GIT_COMMIT.take(7)
                    sh "docker build -t ${IMAGE_NAME}:${env.IMAGE_TAG} ."
                }
            }
        }

        stage('Trivy image scan') {
            steps {
                script {
                    sh """
                        echo "=== Trivy image scan ==="
                        docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:0.69.3 image \
                            --severity HIGH,CRITICAL \
                            --exit-code 0 \
                            --no-progress \
                            --timeout 15m \
                            ${IMAGE_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }
    }
}
