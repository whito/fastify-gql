const { Readable } = require('stream')

class PubSub {
  constructor (emitter) {
    this.emitter = emitter
  }

  subscribe (topic, queue) {
    return new Promise((resolve, reject) => {
      function listener (value, cb) {
        queue.push(value.payload)
        cb()
      }

      const close = () => {
        this.emitter.removeListener(topic, listener)
      }

      this.emitter.on(topic, listener, (err) => {
        if (err) {
          return reject(err)
        }

        resolve()
      })
      queue.close = close
    })
  }

  publish (event, callback) {
    this.emitter.emit(event, callback)
  }
}

// One context - and  queue for each subscription
class SubscriptionContext {
  constructor ({ pubsub, fastify }) {
    this.fastify = fastify
    this.pubsub = pubsub
    this.queue = new Readable({
      objectMode: true,
      read: () => {}
    })
  }

  subscribe (topic) {
    return this.pubsub.subscribe(topic, this.queue).then(() => this.queue)
  }

  publish (event) {
    return new Promise((resolve, reject) => {
      this.pubsub.publish(event, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    }).catch(err => {
      this.fastify.log.error(err)
    })
  }

  close () {
    this.queue.close()
    this.queue.destroy()
  }
}

module.exports = {
  PubSub,
  SubscriptionContext
}
