import os
from pathlib import Path
from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

# Load API key from server .env (shared config for ingestion)
load_dotenv(Path(__file__).resolve().parents[1] / "server" / ".env")

def load_documents(docs_path="docs"):
    """Load all text files from the docs directory, with encoding fallback."""
    print(f"Loading documents from {docs_path}...")
    
    # Check if docs directory exists
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"The directory {docs_path} does not exist. Please create it and add your files.")
    
    docs_path = Path(docs_path)
    txt_files = sorted(docs_path.glob("*.txt"))
    if len(txt_files) == 0:
        raise FileNotFoundError(f"No .txt files found in {docs_path}. Please add your company documents.")

    documents = []
    encodings = ["utf-8", "utf-16", "latin-1"]
    for file_path in txt_files:
        content = None
        last_error = None
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except Exception as e:
                last_error = e
        if content is None:
            raise RuntimeError(f"Error loading {file_path}") from last_error
        documents.append(
            Document(page_content=content, metadata={"source": str(file_path)})
        )
    
   
    for i, doc in enumerate(documents[:2]):  # Show first 2 documents
        print(f"\nDocument {i+1}:")
        print(f"  Source: {doc.metadata['source']}")
        print(f"  Content length: {len(doc.page_content)} characters")
        print(f"  Content preview: {doc.page_content[:100]}...")
        print(f"  metadata: {doc.metadata}")

    return documents

def split_documents(documents, chunk_size=1000, chunk_overlap=0):
    """Split documents into smaller chunks with overlap"""
    print("Splitting documents into chunks...")
    
    text_splitter = CharacterTextSplitter(
        chunk_size=chunk_size, 
        chunk_overlap=chunk_overlap
    )
    
    chunks = text_splitter.split_documents(documents)
    
    if chunks:
    
        for i, chunk in enumerate(chunks[:5]):
            print(f"\n--- Chunk {i+1} ---")
            print(f"Source: {chunk.metadata['source']}")
            print(f"Length: {len(chunk.page_content)} characters")
            print(f"Content:")
            print(chunk.page_content)
            print("-" * 50)
        
        if len(chunks) > 5:
            print(f"\n... and {len(chunks) - 5} more chunks")
    
    return chunks

def create_vector_store(chunks, persist_directory="db/chroma_db"):
    """Create and persist ChromaDB vector store"""
    print("Creating embeddings and storing in ChromaDB...")
        
    embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Create ChromaDB vector store
    print("--- Creating vector store ---")
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        persist_directory=persist_directory, 
        collection_metadata={"hnsw:space": "cosine"}
    )
    print("--- Finished creating vector store ---")
    
    print(f"Vector store created and saved to {persist_directory}")
    return vectorstore

def main():
    """Main ingestion pipeline"""
    print("=== RAG Document Ingestion Pipeline ===\n")
    
    # Define paths
    docs_path = Path(__file__).resolve().parent / "docs"
    persistent_directory = "db/chroma_db"
    
    # # Check if vector store already exists
    # if os.path.exists(persistent_directory):
    #     print("✅ Vector store already exists. No need to re-process documents.")
        
    #     embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
    #     vectorstore = Chroma(
    #         persist_directory=persistent_directory,
    #         embedding_function=embedding_model, 
    #         collection_metadata={"hnsw:space": "cosine"}
    #     )
    #     print(f"Loaded existing vector store with {vectorstore._collection.count()} documents")
    #     return vectorstore
    
    # print("Persistent directory does not exist. Initializing vector store...\n")
    
    # Step 1: Load documents
    documents = load_documents(str(docs_path))  

    # Step 2: Split into chunks
    chunks = split_documents(documents)
    
    # # Step 3: Create vector store
    vectorstore = create_vector_store(chunks, persistent_directory)
    
    #print("\n✅ Ingestion complete! Your documents are now ready for RAG queries.")
    #return vectorstore

if __name__ == "__main__":
    main()


