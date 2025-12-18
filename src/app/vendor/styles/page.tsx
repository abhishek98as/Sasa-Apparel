'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/loading';
import { Search } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
  fabricType: string;
  description?: string;
  isActive: boolean;
}

export default function VendorStylesPage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/styles');
      const result = await response.json();
      if (result.success) {
        setStyles(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch styles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStyles = styles.filter(
    (s) =>
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="My Styles"
        subtitle="View your assigned styles"
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Fabric Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStyles.length === 0 ? (
                  <TableEmpty message="No styles found" colSpan={5} />
                ) : (
                  filteredStyles.map((style) => (
                    <TableRow key={style._id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {style.code}
                      </TableCell>
                      <TableCell className="font-medium">{style.name}</TableCell>
                      <TableCell>
                        <Badge variant="info">{style.fabricType}</Badge>
                      </TableCell>
                      <TableCell className="text-surface-500">
                        {style.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={style.isActive ? 'success' : 'danger'}>
                          {style.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

